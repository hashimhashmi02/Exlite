import nodemailer from "nodemailer";
import { env } from "./env.js";

export async function sendMagicLinkEmail(to: string, link: string) {
  const hasSmtp = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  let transporter;
  if (hasSmtp) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 465),
      secure: Number(env.SMTP_PORT || 465) === 465,
      auth: { user: env.SMTP_USER!, pass: (env.SMTP_PASS as string).replace(/\s+/g, "") },
    });
  } else {
    const test = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: test.smtp.host, port: test.smtp.port, secure: test.smtp.secure,
      auth: { user: test.user, pass: test.pass },
    });
    console.log("⚠️ Using Ethereal test SMTP. A preview URL will be logged.");
  }

  const info = await transporter.sendMail({
    from: env.MAIL_FROM || env.SMTP_USER || "no-reply@example.com",
    to,
    subject: "Your sign-in link",
    html: `<p>Click to sign in:</p>
           <p><a href="${link}">${link}</a></p>
           <p>Link expires in 15 minutes.</p>`,
  });

  // Dev hints
  // @ts-ignore
  const preview = (nodemailer.getTestMessageUrl?.(info));
  if (preview) console.log("📧 Ethereal preview:", preview);
  if (process.env.NODE_ENV !== "production") console.log("Magic link:", link);
}
