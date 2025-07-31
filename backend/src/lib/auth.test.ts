import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractBearerToken,
  generateUserId,
  generateImageId
} from './auth';

describe('Auth utilities', () => {
  describe('hashPassword', () => {
    it('should hash password successfully', () => {
      const password = 'testpassword123';
      const result = hashPassword(password);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data).not.toBe(password);
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it('should return different hashes for same password', () => {
      const password = 'testpassword123';
      const result1 = hashPassword(password);
      const result2 = hashPassword(password);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data).not.toBe(result2.data);
      }
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'testpassword123';
      const hashResult = hashPassword(password);
      
      expect(hashResult.success).toBe(true);
      if (hashResult.success) {
        const verifyResult = verifyPassword(password, hashResult.data);
        expect(verifyResult.success).toBe(true);
        if (verifyResult.success) {
          expect(verifyResult.data).toBe(true);
        }
      }
    });

    it('should reject incorrect password', () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hashResult = hashPassword(password);
      
      expect(hashResult.success).toBe(true);
      if (hashResult.success) {
        const verifyResult = verifyPassword(wrongPassword, hashResult.data);
        expect(verifyResult.success).toBe(true);
        if (verifyResult.success) {
          expect(verifyResult.data).toBe(false);
        }
      }
    });
  });

  describe('generateToken', () => {
    const secret = 'test-secret-key';
    const payload = { userId: 'user-123', username: 'testuser' };

    it('should generate token successfully', () => {
      const result = generateToken(payload, secret);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe('string');
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it('should generate tokens with different timestamps', async () => {
      const result1 = generateToken(payload, secret);
      
      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result2 = generateToken(payload, secret);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data).not.toBe(result2.data);
      }
    });
  });

  describe('verifyToken', () => {
    const secret = 'test-secret-key';
    const payload = { userId: 'user-123', username: 'testuser' };

    it('should verify valid token', () => {
      const tokenResult = generateToken(payload, secret);
      expect(tokenResult.success).toBe(true);
      
      if (tokenResult.success) {
        const verifyResult = verifyToken(tokenResult.data, secret);
        expect(verifyResult.success).toBe(true);
        
        if (verifyResult.success) {
          expect(verifyResult.data.userId).toBe(payload.userId);
          expect(verifyResult.data.username).toBe(payload.username);
          expect(verifyResult.data.iat).toBeDefined();
          expect(verifyResult.data.exp).toBeDefined();
        }
      }
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const result = verifyToken(invalidToken, secret);
      
      expect(result.success).toBe(false);
    });

    it('should reject token with wrong secret', () => {
      const tokenResult = generateToken(payload, secret);
      expect(tokenResult.success).toBe(true);
      
      if (tokenResult.success) {
        const verifyResult = verifyToken(tokenResult.data, 'wrong-secret');
        expect(verifyResult.success).toBe(false);
      }
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;
      const result = extractBearerToken(authHeader);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(token);
      }
    });

    it('should reject missing Authorization header', () => {
      const result = extractBearerToken(undefined);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Authorization header missing');
      }
    });

    it('should reject Authorization header without Bearer prefix', () => {
      const result = extractBearerToken('Basic dGVzdDp0ZXN0');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('must start with Bearer');
      }
    });

    it('should reject Authorization header with only Bearer', () => {
      const result = extractBearerToken('Bearer ');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Token missing');
      }
    });
  });

  describe('ID generators', () => {
    it('should generate unique user IDs', () => {
      const id1 = generateUserId();
      const id2 = generateUserId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate unique image IDs', () => {
      const id1 = generateImageId();
      const id2 = generateImageId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate UUIDs format', () => {
      const userId = generateUserId();
      const imageId = generateImageId();
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(userId).toMatch(uuidRegex);
      expect(imageId).toMatch(uuidRegex);
    });
  });
});