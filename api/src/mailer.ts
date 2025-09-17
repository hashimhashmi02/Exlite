import nodemailer from "nodemailer";
import { env } from "./env.js";

let transporter: nodemailer.Transporter | null = null;

export async function initMailer() {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465, 
    auth: env.SMTP_USER && env.SMTP_PASS ? {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    } : undefined,
  });

  await transporter.verify();
  console.log(`📧 SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT}) as ${env.SMTP_USER}`);
}

export async function sendMagicLink(to: string, url: string): Promise<void> {
  if (!transporter) throw new Error("mailer-not-initialised");

  const from = env.MAIL_FROM || env.SMTP_USER!;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <h2>Sign in to Exlite</h2>
      <p>Click the button or link below to sign in:</p>
      <p>
        <a href="${url}" 
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">
          Sign in
        </a>
      </p>
      <p style="word-break:break-all;"><a href="${url}">${url}</a></p>
      <p style="color:#666">This link expires in ~10 minutes.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: "Your Exlite sign-in link",
    html,
  });
}
