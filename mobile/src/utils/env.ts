import { z } from 'zod';

/**
 * Validated runtime environment.
 *
 * EXPO_PUBLIC_* variables are inlined into the JS bundle at build time, which
 * means they are PUBLIC: anyone can unzip the app and read them. Never put
 * secrets here. They must also be read with the full static
 * `process.env.EXPO_PUBLIC_X` expression — dynamic access (process.env[key])
 * is not inlined by Metro.
 */

const booleanString = z
  .enum(['true', 'false'], { message: 'must be "true" or "false"' })
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    EXPO_PUBLIC_API_URL: z.url({ message: 'must be a valid URL' }),
    EXPO_PUBLIC_USE_MOCK_API: booleanString,
    EXPO_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
    EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN: booleanString,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
    EXPO_PUBLIC_ENABLE_PUSH: booleanString.default(false),
  })
  .superRefine((env, ctx) => {
    if (env.EXPO_PUBLIC_APP_ENV !== 'production') return;
    if (!env.EXPO_PUBLIC_API_URL.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['EXPO_PUBLIC_API_URL'], message: 'production requires https' });
    }
    if (env.EXPO_PUBLIC_USE_MOCK_API) {
      ctx.addIssue({ code: 'custom', path: ['EXPO_PUBLIC_USE_MOCK_API'], message: 'the mock API is not allowed in production' });
    }
  });

type Env = {
  apiUrl: string;
  useMockApi: boolean;
  appEnv: 'development' | 'staging' | 'production';
  enableGoogleSignIn: boolean;
  googleWebClientId: string | null;
  enablePush: boolean;
};

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration. Check your .env file:\n${problems}`);
  }
  const env = result.data;
  return {
    apiUrl: env.EXPO_PUBLIC_API_URL.replace(/\/+$/, ''),
    useMockApi: env.EXPO_PUBLIC_USE_MOCK_API,
    appEnv: env.EXPO_PUBLIC_APP_ENV,
    enableGoogleSignIn: env.EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN,
    googleWebClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || null,
    enablePush: env.EXPO_PUBLIC_ENABLE_PUSH,
  };
}

// Parsed once at module load: a misconfigured build fails immediately at startup
// instead of failing later on the first network call.
export const env: Env = parseEnv({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_USE_MOCK_API: process.env.EXPO_PUBLIC_USE_MOCK_API,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_ENABLE_PUSH: process.env.EXPO_PUBLIC_ENABLE_PUSH,
});
