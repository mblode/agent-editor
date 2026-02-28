import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),

  // Anthropic - org-level key for Linktree's own Anthropic account
  // In a BYOK scenario, this is the fallback; per-user keys come from the DB
  ANTHROPIC_API_KEY: z.string().min(1),

  // AES-256-GCM encryption key for user API keys stored in DB (base64 encoded, 32 bytes)
  ENCRYPTION_KEY: z.string().min(44),

  // Database (Turso / LibSQL)
  DATABASE_URL: z.string().default("file:./dev.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Sprites.dev for sandbox (optional in development)
  SPRITES_TOKEN: z.string().optional(),

  // CORS origin for the web app
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    for (const [field, errors] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${field}: ${errors?.join(", ")}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
