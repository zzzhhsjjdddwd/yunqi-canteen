function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';

export const JWT_SECRET = IS_PROD ? requireEnv('JWT_SECRET') : (process.env.JWT_SECRET || 'dev-jwt-secret');

export const DATABASE_URL = requireEnv('DATABASE_URL');

export const ALLOWED_ORIGINS = parseCsv(process.env.ALLOWED_ORIGINS);
export const RENDER_EXTERNAL_HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME;

export function getCorsAllowedOrigins(): string[] {
  const origins = new Set<string>();

  origins.add('http://localhost:5173');
  origins.add('http://localhost:5174');
  origins.add('http://127.0.0.1:5173');
  origins.add('http://127.0.0.1:5174');

  for (const o of ALLOWED_ORIGINS) origins.add(o);

  if (RENDER_EXTERNAL_HOSTNAME) {
    origins.add(`https://${RENDER_EXTERNAL_HOSTNAME}`);
  }

  return Array.from(origins);
}

export function assertStartupEnv() {
  requireEnv('DATABASE_URL');
  if (IS_PROD) {
    requireEnv('JWT_SECRET');
  }
}
