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

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadRoutes(fastify: FastifyInstance) {
  // POST /api/upload — upload a single image to S3
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

      const ext = data.mimetype.split("/")[1] ?? "jpg";
      const key = `inventory/${request.user!.id}/${randomUUID()}.${ext}`;

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks);

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: body,
          ContentType: data.mimetype,
        })
      );

      const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

      return reply.status(201).send({ success: true, data: { url, key } });
    }
  );
}
