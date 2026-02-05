import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "./env.js";
import { log } from "./logger.js";

let transporter: nodemailer.Transporter | null = null;
let resend: Resend | null = null;
let useEthereal = false;

export async function initMailer() {
  // Try Resend first
  if (env.RESEND_API_KEY) {
    try {
      resend = new Resend(env.RESEND_API_KEY);
      log.info("📧 Resend initialized");
      return;
    } catch (e) {
      log.warn("Resend initialization failed", { error: (e as Error).message });
    }
  }

  // Try Gmail SMTP first if configured
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 465),
        secure: Number(env.SMTP_PORT || 465) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS.replace(/\s+/g, ""), // Remove any whitespace
        },
      });

      await transporter.verify();
      log.info(`📧 SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT}) as ${env.SMTP_USER}`);
      return;
    } catch (e) {
      log.warn("SMTP verification failed, falling back to Ethereal", {
        error: (e as Error).message,
      });
    }
  }

  // Fallback to Ethereal test account
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    useEthereal = true;
    log.info("📧 Using Ethereal test SMTP - check console for preview links");
  } catch (e) {
    log.error("Failed to create Ethereal account", {
      error: (e as Error).message,
    });
    throw e;
  }
}

export async function sendMagicLink(to: string, url: string): Promise<void> {
  if (!transporter && !resend) {
    log.warn("Mailer not initialized, attempting to initialize...");
    await initMailer();
  }

  if (!transporter && !resend) throw new Error("mailer-not-initialised");

  const from = env.MAIL_FROM || env.SMTP_USER || "no-reply@exlite.app";
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

  if (resend) {
    try {
      // Use onboarding@resend.dev if default domain not verified, but prefer env.MAIL_FROM
      // Note: for testing free tier, user MUST use onboarding@resend.dev OR a verified domain.
      // We will let the user configure MAIL_FROM in env.
      await resend.emails.send({
        from,
        to,
        subject: "Your Exlite sign-in link",
        html,
      });
      log.info(`📧 Email sent via Resend to ${to}`);
      return;
    } catch (e) {
      log.error("Resend failed", { error: e });
      // Fallback to SMTP not implemented to avoid complexity, assume Resend is primary if configured.
      throw e;
    }
  }

  const info = await transporter!.sendMail({
    from,
    to,
    subject: "Your Exlite sign-in link",
    html,
  });

  // Show Ethereal preview URL if using test account
  if (useEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      log.info(`📧 Ethereal preview: ${previewUrl}`);
      console.log(`\n📧 MAGIC LINK EMAIL PREVIEW: ${previewUrl}\n`);
    }
  }

  // Always log the magic link in development for easy access
  if (env.NODE_ENV === "development") {
    console.log(`\n🔗 MAGIC LINK: ${url}\n`);
  }
}

