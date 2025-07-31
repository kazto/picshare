import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Context } from 'hono';
import { Env, JWTPayload, Result } from '../types';

export function hashPassword(password: string): Result<string> {
  try {
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    return { success: true, data: hash };
  } catch (error) {
    return { success: false, error: `Failed to hash password: ${error}` };
  }
}

export function verifyPassword(password: string, hash: string): Result<boolean> {
  try {
    const isValid = bcrypt.compareSync(password, hash);
    return { success: true, data: isValid };
  } catch (error) {
    return { success: false, error: `Failed to verify password: ${error}` };
  }
}

export function generateToken(payload: { userId: string; username: string }, secret: string): Result<string> {
  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: '24h',
      issuer: 'picshare-api'
    });
    return { success: true, data: token };
  } catch (error) {
    return { success: false, error: `Failed to generate token: ${error}` };
  }
}

export function verifyToken(token: string, secret: string): Result<JWTPayload> {
  try {
    const payload = jwt.verify(token, secret) as JWTPayload;
    return { success: true, data: payload };
  } catch (error) {
    return { success: false, error: `Invalid token: ${error}` };
  }
}

export function extractBearerToken(authHeader: string | undefined): Result<string> {
  if (!authHeader) {
    return { success: false, error: 'Authorization header missing' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Authorization header must start with Bearer' };
  }

  const token = authHeader.substring(7);
  if (!token) {
    return { success: false, error: 'Token missing from Authorization header' };
  }

  return { success: true, data: token };
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  
  const tokenResult = extractBearerToken(authHeader);
  if (!tokenResult.success) {
    return c.json({ error: tokenResult.error }, 401);
  }

  const verifyResult = verifyToken(tokenResult.data, c.env.JWT_SECRET);
  if (!verifyResult.success) {
    return c.json({ error: verifyResult.error }, 401);
  }

  c.set('user', verifyResult.data);
  await next();
}

export function generateUserId(): string {
  return crypto.randomUUID();
}

export function generateImageId(): string {
  return crypto.randomUUID();
}