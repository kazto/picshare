import { D1Database } from '@cloudflare/workers-types';
import { User, Image, Result } from '../types';

// User operations
export async function createUser(db: D1Database, user: Omit<User, 'created_at'>): Promise<Result<User>> {
  try {
    const result = await db
      .prepare(
        'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?) RETURNING *'
      )
      .bind(user.id, user.username, user.password_hash)
      .first<User>();
    
    if (!result) {
      return { success: false, error: 'Failed to create user' };
    }
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

export async function getUserByUsername(db: D1Database, username: string): Promise<Result<User | null>> {
  try {
    const user = await db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first<User>();
    
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

export async function getUserById(db: D1Database, id: string): Promise<Result<User | null>> {
  try {
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
    
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

// Image operations
export async function createImage(db: D1Database, image: Omit<Image, 'upload_date'>): Promise<Result<Image>> {
  try {
    const result = await db
      .prepare(`
        INSERT INTO images (id, filename, original_filename, size, mime_type, r2_key, public_url, user_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(
        image.id,
        image.filename,
        image.original_filename,
        image.size,
        image.mime_type,
        image.r2_key,
        image.public_url,
        image.user_id,
        image.metadata || null
      )
      .first<Image>();
    
    if (!result) {
      return { success: false, error: 'Failed to create image record' };
    }
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

export async function getImagesByUserId(
  db: D1Database,
  userId: string,
  limit = 20,
  offset = 0
): Promise<Result<{ images: Image[]; total: number }>> {
  try {
    const [images, countResult] = await Promise.all([
      db
        .prepare(`
          SELECT * FROM images 
          WHERE user_id = ? 
          ORDER BY upload_date DESC 
          LIMIT ? OFFSET ?
        `)
        .bind(userId, limit, offset)
        .all<Image>(),
      db
        .prepare('SELECT COUNT(*) as count FROM images WHERE user_id = ?')
        .bind(userId)
        .first<{ count: number }>()
    ]);

    return {
      success: true,
      data: {
        images: images.results || [],
        total: countResult?.count || 0
      }
    };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

export async function getImageById(db: D1Database, id: string, userId: string): Promise<Result<Image | null>> {
  try {
    const image = await db
      .prepare('SELECT * FROM images WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<Image>();
    
    return { success: true, data: image };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

export async function deleteImage(db: D1Database, id: string, userId: string): Promise<Result<boolean>> {
  try {
    const result = await db
      .prepare('DELETE FROM images WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
    
    return { success: true, data: result.success && result.changes > 0 };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}

export async function getTotalStorageUsed(db: D1Database, userId: string): Promise<Result<number>> {
  try {
    const result = await db
      .prepare('SELECT SUM(size) as total_size FROM images WHERE user_id = ?')
      .bind(userId)
      .first<{ total_size: number | null }>();
    
    return { success: true, data: result?.total_size || 0 };
  } catch (error) {
    return { success: false, error: `Database error: ${error}` };
  }
}