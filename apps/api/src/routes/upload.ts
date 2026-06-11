import type { FastifyInstance } from "fastify";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";

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
  // POST /api/upload — upload a single image to S3
  // Optional PhotoRoom v2 editing via query params:
  //   ?removeBackground=true  — AI background removal
  //   ?flatLay=true           — AI flat lay generation
  //   ?ironing=true           — AI wrinkle removal
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

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }

      let body: Buffer<ArrayBufferLike> = Buffer.concat(chunks);
      let contentType = data.mimetype;
      let ext = data.mimetype.split("/")[1] ?? "jpg";

      const q = request.query as { removeBackground?: string; flatLay?: string; ironing?: string };
      const editOptions: PhotoroomEditOptions = {
        removeBackground: q.removeBackground === "true",
        flatLay: q.flatLay === "true",
        ironing: q.ironing === "true",
      };
      const usePhotoroom = editOptions.removeBackground || editOptions.flatLay || editOptions.ironing;

      if (usePhotoroom) {
        try {
          body = await callPhotoroomV2(body, contentType, editOptions);
          contentType = "image/png";
          ext = "png";
        } catch (err) {
          const message = err instanceof Error ? err.message : "PhotoRoom processing failed";
          return reply.status(502).send({ success: false, error: message });
        }
      }

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
