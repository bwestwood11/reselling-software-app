// Local CLI for the residential-proxy diagnostics (src/services/proxy/proxy-diagnostics.ts).
//
//   pnpm --filter @repo/api proxy:test check
//   pnpm --filter @repo/api proxy:test compression [file-or-https-url ...]
//   pnpm --filter @repo/api proxy:test mercari-upload --user <userId> [--modes proxied]
//   pnpm --filter @repo/api proxy:test mercari-cloudflare --user <userId>
//   pnpm --filter @repo/api proxy:test usage [--month 2026-11] [--price 8]
//
// Reads apps/api/.env. NOTE: run mercari-upload's "direct" mode on the production server
// (POST /api/internal/proxy-tests/mercari-upload) — from a home PC it proves nothing.

import "dotenv/config";
import { readFileSync } from "fs";
import { prisma } from "@repo/db";
import {
  checkProxy,
  compressionTest,
  mercariCloudflareTest,
  mercariUploadTest,
  syntheticPhoto,
  usageReport,
} from "../../src/services/proxy/proxy-diagnostics";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function positional(): string[] {
  const out: string[] = [];
  const args = process.argv.slice(3);
  for (let i = 0; i < args.length; i++) {
    if (args[i]!.startsWith("--")) i++;
    else out.push(args[i]!);
  }
  return out;
}

function requireUser(): string {
  const user = flag("user");
  if (!user) {
    console.error("--user <userId> is required (a user with a connected Mercari account)");
    process.exit(1);
  }
  return user;
}

async function main() {
  const test = process.argv[2];
  let result: unknown;

  switch (test) {
    case "check":
      result = await checkProxy(prisma);
      break;
    case "compression": {
      const sources = positional();
      const inputs: Array<{ source: string; buffer: Buffer }> = [];
      for (const src of sources) {
        if (/^https:\/\//i.test(src)) {
          const res = await fetch(src);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
          inputs.push({ source: src, buffer: Buffer.from(await res.arrayBuffer()) });
        } else {
          inputs.push({ source: src, buffer: readFileSync(src) });
        }
      }
      if (inputs.length === 0) {
        inputs.push({ source: "synthetic 3000x4000", buffer: await syntheticPhoto() });
      }
      result = await compressionTest(inputs);
      break;
    }
    case "mercari-upload": {
      const modes = (flag("modes") ?? "direct,proxied").split(",") as Array<"direct" | "proxied">;
      result = await mercariUploadTest(prisma, requireUser(), modes);
      break;
    }
    case "mercari-cloudflare":
      result = await mercariCloudflareTest(prisma, requireUser());
      break;
    case "usage":
      result = await usageReport(prisma, {
        month: flag("month"),
        pricePerGb: flag("price") ? Number(flag("price")) : undefined,
      });
      break;
    default:
      console.error(
        "Usage: proxy:test <check | compression | mercari-upload | mercari-cloudflare | usage> [options]"
      );
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    // Undici proxy agents keep sockets alive — exit explicitly once done.
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  });
