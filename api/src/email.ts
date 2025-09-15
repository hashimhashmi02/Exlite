import nodemailer from 'nodemailer';
import { env } from './env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: Number(env.SMTP_PORT) === 465,
  auth: env.SMTP_USER && env.SMTP_PASS ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  } : undefined
});

export async function sendMagicLinkEmail(to: string, link: string) {
  const info = await transporter.sendMail({
    from: env.MAIL_FROM || env.SMTP_USER,
    to,
    subject: 'Your sign-in link',
    html: `<p>Click to sign in:</p>
           <p><a href="${link}">${link}</a></p>
           <p>Link expires in 15 minutes.</p>`
  });
  return info.messageId;
}
