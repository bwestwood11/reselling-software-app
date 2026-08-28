import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// Reuses the AWS account already configured for S3 image uploads (apps/api/.env).
// Requires the sender identity in EMAIL_FROM to be verified in SES (and SES to be
// out of sandbox mode in production, or recipients must also be verified).
const sesRegion = process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const emailFrom = process.env.EMAIL_FROM ?? "";

const ses = new SESv2Client({
  region: sesRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

/**
 * Sends a one-time verification code via SES. Used for the sign-up email-verification
 * flow (see the `emailOTP` plugin in ./index.ts) — the account can't log in until the
 * code is confirmed.
 */
export async function sendVerificationOtpEmail(email: string, otp: string): Promise<void> {
  if (!emailFrom) {
    console.error("[auth] EMAIL_FROM is not configured — cannot send verification email.");
    return;
  }

  const subject = "Your ReList verification code";
  const text = `Your ReList verification code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px; color: #09090b;">Verify your email</h2>
      <p style="margin: 0 0 24px; color: #3f3f46; font-size: 14px; line-height: 1.5;">
        Enter this code to finish creating your ReList account. It expires in 10 minutes.
      </p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 16px; background: #fafafa; border-radius: 12px; color: #09090b;">
        ${otp}
      </div>
      <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: emailFrom,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: text, Charset: "UTF-8" },
              Html: { Data: html, Charset: "UTF-8" },
            },
          },
        },
      })
    );
  } catch (err) {
    console.error("[auth] Failed to send verification email via SES:", err);
    throw err;
  }
}
