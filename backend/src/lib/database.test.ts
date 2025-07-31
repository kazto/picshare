import { describe, it, expect, beforeEach, vi } from 'vitest';
import { D1Database } from '@cloudflare/workers-types';
import {
  createUser,
  getUserByUsername,
  getUserById,
  createImage,
  getImagesByUserId,
  getImageById,
  deleteImage,
  getTotalStorageUsed
} from './database';
import { User, Image } from '../types';

const createMockD1 = () => {
  const mockPrepare = vi.fn();
  const mockBind = vi.fn();
  const mockFirst = vi.fn();
  const mockAll = vi.fn();
  const mockRun = vi.fn();

  const mockStatement = {
    bind: mockBind.mockReturnThis(),
    first: mockFirst,
    all: mockAll,
    run: mockRun,
  };

  mockPrepare.mockReturnValue(mockStatement);

  const mockDb = {
    prepare: mockPrepare,
  } as unknown as D1Database;

  return {
    mockDb,
    mockPrepare,
    mockBind,
    mockFirst,
    mockAll,
    mockRun,
  };
};

describe('Database functions', () => {
  describe('createUser', () => {
    it('should create user successfully', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      const userInput = {
        id: 'user-123',
        username: 'testuser',
        password_hash: 'hashed_password'
      };
      
      const expectedUser: User = {
        ...userInput,
        created_at: '2024-01-01T00:00:00Z'
      };
      
      mockFirst.mockResolvedValue(expectedUser);
      
      const result = await createUser(mockDb, userInput);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedUser);
      }
    });

    it('should handle database error', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      const userInput = {
        id: 'user-123',
        username: 'testuser',
        password_hash: 'hashed_password'
      };
      
      mockFirst.mockRejectedValue(new Error('Database connection failed'));
      
      const result = await createUser(mockDb, userInput);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Database error');
      }
    });

    it('should handle null result from database', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      const userInput = {
        id: 'user-123',
        username: 'testuser',
        password_hash: 'hashed_password'
      };
      
      mockFirst.mockResolvedValue(null);
      
      const result = await createUser(mockDb, userInput);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to create user');
      }
    });
  });

  describe('getUserByUsername', () => {
    it('should get user by username successfully', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      const expectedUser: User = {
        id: 'user-123',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      mockFirst.mockResolvedValue(expectedUser);
      
      const result = await getUserByUsername(mockDb, 'testuser');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedUser);
      }
    });

    it('should return null when user not found', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      mockFirst.mockResolvedValue(null);
      
      const result = await getUserByUsername(mockDb, 'nonexistent');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('createImage', () => {
    it('should create image successfully', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      const imageInput = {
        id: 'image-123',
        filename: 'test.jpg',
        original_filename: 'original.jpg',
        size: 1024,
        mime_type: 'image/jpeg',
        r2_key: 'images/2024/01/image-123.jpg',
        public_url: 'https://example.com/image-123.jpg',
        user_id: 'user-123',
        metadata: JSON.stringify({ width: 800, height: 600 })
      };
      
      const expectedImage: Image = {
        ...imageInput,
        upload_date: '2024-01-01T00:00:00Z'
      };
      
      mockFirst.mockResolvedValue(expectedImage);
      
      const result = await createImage(mockDb, imageInput);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedImage);
      }
    });
  });

  describe('getImagesByUserId', () => {
    it('should get images by user ID with pagination', async () => {
      const { mockDb, mockAll, mockFirst } = createMockD1();
      
      const images: Image[] = [
        {
          id: 'image-1',
          filename: 'test1.jpg',
          original_filename: 'original1.jpg',
          size: 1024,
          mime_type: 'image/jpeg',
          r2_key: 'images/2024/01/image-1.jpg',
          public_url: 'https://example.com/image-1.jpg',
          user_id: 'user-123',
          upload_date: '2024-01-01T00:00:00Z'
        }
      ];
      
      mockAll.mockResolvedValue({ results: images });
      mockFirst.mockResolvedValue({ count: 1 });
      
      const result = await getImagesByUserId(mockDb, 'user-123', 20, 0);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.images).toEqual(images);
        expect(result.data.total).toBe(1);
      }
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const { mockDb, mockRun } = createMockD1();
      
      mockRun.mockResolvedValue({ success: true, changes: 1 });
      
      const result = await deleteImage(mockDb, 'image-123', 'user-123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false when no rows affected', async () => {
      const { mockDb, mockRun } = createMockD1();
      
      mockRun.mockResolvedValue({ success: true, changes: 0 });
      
      const result = await deleteImage(mockDb, 'image-123', 'user-123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe('getTotalStorageUsed', () => {
    it('should calculate total storage used', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      mockFirst.mockResolvedValue({ total_size: 2048 });
      
      const result = await getTotalStorageUsed(mockDb, 'user-123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(2048);
      }
    });

    it('should return 0 when no images', async () => {
      const { mockDb, mockFirst } = createMockD1();
      
      mockFirst.mockResolvedValue({ total_size: null });
      
      const result = await getTotalStorageUsed(mockDb, 'user-123');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });
  });
});