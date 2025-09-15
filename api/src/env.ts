import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('465'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  DEFAULT_SPREAD_BIPS: z.string().default('16'),   // 0.16% total spread
  DEV_EMAIL_ECHO: z.string().default('true'),
  PORT: z.coerce.number().default(8080),
  BACKEND_URL: z.string().url().default('http://localhost:8080'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'fdc0f3c1a6e96b8d2ab3bf1f0f90a2b7f6d4c8e1a3b5c7d9e0f1a2b3c4d5e6f7'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),

});


const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
