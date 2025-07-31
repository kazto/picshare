-- Initial migration: Create users and images tables

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Images table
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  user_id TEXT NOT NULL,
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON format for EXIF and other metadata
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_upload_date ON images(upload_date DESC);
CREATE INDEX idx_users_username ON users(username);