import nodemailer from "nodemailer";
import { env } from "./env.js";

const port = Number(env.SMTP_PORT || 587);
const secure = port === 465; // true for 465, false for 587

export const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

export async function sendMagicLink(to: string, url: string) {
  if (!transporter) {
    // Dev fallback: log the link so you can click it
    console.log("[dev] magic link:", url);
    return;
  }

  const info = await transporter.sendMail({
    from: env.MAIL_FROM || env.SMTP_USER,
    to,
    subject: "Your Exlite sign-in link",
    text: `Click to sign in: ${url}\nThis link expires in 10 minutes.`,
    html: `<p>Click to sign in:</p>
           <p><a href="${url}">${url}</a></p>
           <p>This link expires in 10 minutes.</p>`,
  });

  console.log("Magic link email queued:", info.messageId);
}
