import type { FastifyInstance } from "fastify";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";
import { SubscriptionService } from "../services/subscription.service";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";
const PHOTOROOM_V2_URL = "https://image-api.photoroom.com/v2/edit";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface PhotoroomEditOptions {
  removeBackground: boolean;
  flatLay: boolean;
  ironing: boolean;
  ghostMannequin: boolean;
}

async function callPhotoroomV2(
  imageBuffer: Buffer,
  mimeType: string,
  options: PhotoroomEditOptions
): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) throw new Error("PHOTOROOM_API_KEY is not configured.");

  const formData = new FormData();
  formData.append("imageFile", new Blob([imageBuffer], { type: mimeType }), "image");
  formData.append("removeBackground", String(options.removeBackground));
  if (options.flatLay) formData.append("flatLay.mode", "ai.auto");
  if (options.ironing) formData.append("ironing.mode", "ai.auto");
  if (options.ghostMannequin) formData.append("ghostMannequin.mode", "ai.auto");

  const res = await fetch(PHOTOROOM_V2_URL, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PhotoRoom API error ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer() as ArrayBuffer);
}

export async function uploadRoutes(fastify: FastifyInstance) {
  // POST /api/upload
  // Optional PhotoRoom v2 editing via query params:
  //   ?removeBackground=true  — bg removal (Full-Time / Enterprise plan, monthly credits)
  //   ?flatLay=true           — flat lay generation (add-on credits required)
  //   ?ironing=true           — wrinkle removal (add-on credits required)
  //   ?ghostMannequin=true    — mannequin removal (add-on credits required)
  fastify.post(
    "/",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!BUCKET) {
        return reply
          .status(500)
          .send({ success: false, error: "S3 is not configured on this server." });
      }

      const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE } });

      if (!data) {
        return reply.status(400).send({ success: false, error: "No file provided." });
      }

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: `Unsupported file type: ${data.mimetype}. Allowed: jpeg, png, webp, gif.`,
        });
      }

      const q = request.query as {
        removeBackground?: string;
        flatLay?: string;
        ironing?: string;
        ghostMannequin?: string;
      };
      const editOptions: PhotoroomEditOptions = {
        removeBackground: q.removeBackground === "true",
        flatLay: q.flatLay === "true",
        ironing: q.ironing === "true",
        ghostMannequin: q.ghostMannequin === "true",
      };
      const usePhotoroom =
        editOptions.removeBackground || editOptions.flatLay || editOptions.ironing || editOptions.ghostMannequin;

      // ── Credit pre-checks (before consuming file buffer) ────────────────────
      if (usePhotoroom) {
        const subSvc = new SubscriptionService(fastify.prisma);
        const userId = request.user!.id;

        if (editOptions.removeBackground) {
          const ok = await subSvc.checkBgRemovalCredit(userId);
          if (!ok) {
            return reply.status(403).send({
              success: false,
              error:
                "Background removal requires the Full-Time or Enterprise plan with credits remaining.",
            });
          }
        }
        if (editOptions.ironing) {
          const ok = await subSvc.checkIronToolCredit(userId);
          if (!ok) {
            return reply.status(403).send({
              success: false,
              error: "No Iron Tool credits remaining. Purchase a pack from your billing settings.",
            });
          }
        }
        if (editOptions.flatLay) {
          const ok = await subSvc.checkFlatLayCredit(userId);
          if (!ok) {
            return reply.status(403).send({
              success: false,
              error:
                "No Flat Lay credits remaining. Purchase a pack from your billing settings.",
            });
          }
        }
        if (editOptions.ghostMannequin) {
          const ok = await subSvc.checkGhostMannequinCredit(userId);
          if (!ok) {
            return reply.status(403).send({
              success: false,
              error:
                "No Ghost Mannequin credits remaining. Purchase a pack from your billing settings.",
            });
          }
        }
      }

      // ── Buffer the file ───────────────────────────────────────────────────────
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }

      let body: Buffer<ArrayBufferLike> = Buffer.concat(chunks);
      let contentType = data.mimetype;
      let ext = data.mimetype.split("/")[1] ?? "jpg";

      // ── Call PhotoRoom ────────────────────────────────────────────────────────
      if (usePhotoroom) {
        try {
          body = await callPhotoroomV2(body, contentType, editOptions);
          contentType = "image/png";
          ext = "png";
        } catch (err) {
          const message = err instanceof Error ? err.message : "PhotoRoom processing failed";
          return reply.status(502).send({ success: false, error: message });
        }

        // Deduct credits only after successful PhotoRoom processing
        const subSvc = new SubscriptionService(fastify.prisma);
        const userId = request.user!.id;
        try {
          if (editOptions.removeBackground) await subSvc.deductBgRemovalCredit(userId);
          if (editOptions.ironing) await subSvc.deductIronToolCredit(userId);
          if (editOptions.flatLay) await subSvc.deductFlatLayCredit(userId);
          if (editOptions.ghostMannequin) await subSvc.deductGhostMannequinCredit(userId);
        } catch (err) {
          fastify.log.error({ err }, "[upload] Credit deduction failed after PhotoRoom success");
          // Non-fatal: image was processed successfully, don't fail the upload
        }
      }

      // ── Upload to S3 ──────────────────────────────────────────────────────────
      const key = `inventory/${request.user!.id}/${randomUUID()}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );

      const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
      return reply.status(201).send({ success: true, data: { url, key } });
    }
  );
}
