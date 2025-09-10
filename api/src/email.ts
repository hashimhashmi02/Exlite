import { env, isProd } from './env.js';
import { Resend } from 'resend';

export async function sendSignInEmail(email: string, magicUrl: string) {
  if (!isProd) {

    console.log(`🔗 Dev sign-in link for ${email}: ${magicUrl}`);
    return;
  }

  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    throw new Error('RESEND_API_KEY and MAIL_FROM required in production');
  }

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.MAIL_FROM,
    to: email,
    subject: 'Your sign-in link',
    html: `<p>Click to sign in:</p><p><a href="${magicUrl}">${magicUrl}</a></p>`
  });
}
