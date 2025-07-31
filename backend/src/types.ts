import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Image {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  mime_type: string;
  r2_key: string;
  public_url: string;
  user_id: string;
  upload_date: string;
  metadata?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export type Result<T, E = string> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};