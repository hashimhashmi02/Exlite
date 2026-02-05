import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({

  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  BACKEND_URL: z.string().url().default('http://localhost:8080'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16),

  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Exlite <no-reply@example.com>'),
  RESEND_API_KEY: z.string().optional(),

  DEFAULT_SPREAD_BIPS: z.coerce.number().default(16), 
  DEV_EMAIL_ECHO: z.coerce.boolean().default(true),   
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
