// Packages the extension.
//   node scripts/build.mjs        → ../dist/extension/prod/ + ../dist/extension/omventa-crosslister-<version>.zip  (Chrome Web Store upload)
//   node scripts/build.mjs --dev  → ../dist/extension/dev/  (load unpacked; talks to http://localhost:3001)
//
// Only the allowlisted runtime files are copied, so notes, dead code and this script never
// end up in the store package. The dev build re-adds the localhost host permission and points
// API_BASE at the local API — neither belongs in the production manifest.
import { deflateRawSync } from "node:zlib";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");
// Output lives OUTSIDE extension/ (repo-root dist/extension, gitignored) so zipping the extension
// folder by hand can never pick up build artifacts or a second manifest.
const distRoot = resolve(root, "..", "dist", "extension");
const outDir = join(distRoot, dev ? "dev" : "prod");

const FILES = ["manifest.json", "background.js", "popup.html", "popup.js", "popup.css", "icons"];
const API_BASE_PROD = 'const API_BASE = "https://api.omventa.com";';
const LOCAL_API = "http://localhost:3001";

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const f of FILES) cpSync(join(root, f), join(outDir, f), { recursive: true });

const manifestPath = join(outDir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (dev) {
  manifest.name = `${manifest.name} (dev)`;
  manifest.host_permissions.push(`${LOCAL_API}/*`);
  const bgPath = join(outDir, "background.js");
  const bg = readFileSync(bgPath, "utf8");
  if (!bg.includes(API_BASE_PROD)) throw new Error("API_BASE line not found in background.js");
  writeFileSync(bgPath, bg.replace(API_BASE_PROD, `const API_BASE = "${LOCAL_API}";`));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Dev build → ${outDir}\nLoad it via chrome://extensions → Load unpacked.`);
  process.exit(0);
}

// Guard: the store build must not carry dev-only access.
if (JSON.stringify(manifest).includes("localhost")) throw new Error("localhost leaked into prod manifest");

// ── Minimal zip writer (deflate, no dependencies) ────────────────────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const local = [];
const central = [];
let offset = 0;
for (const file of walk(outDir).sort()) {
  const name = Buffer.from(relative(outDir, file).split("\\").join("/"));
  const data = readFileSync(file);
  const packed = deflateRawSync(data);
  const crc = crc32(data);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0x0800, 6); // UTF-8 names
  lh.writeUInt16LE(8, 8); // deflate
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(packed.length, 18);
  lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(name.length, 26);
  local.push(lh, name, packed);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0x0800, 8);
  ch.writeUInt16LE(8, 10);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(packed.length, 20);
  ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(name.length, 28);
  ch.writeUInt32LE(offset, 42);
  central.push(ch, name);
  offset += lh.length + name.length + packed.length;
}
const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(central.length / 2, 8);
end.writeUInt16LE(central.length / 2, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

const zipPath = join(distRoot, `omventa-crosslister-${manifest.version}.zip`);
writeFileSync(zipPath, Buffer.concat([...local, centralBuf, end]));
console.log(`Store package → ${zipPath}`);
