-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Canvases table
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Canvas',
  state_json TEXT NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Canvas images table (tracks all images used in a canvas)
CREATE TABLE IF NOT EXISTS canvas_images (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
);

-- Shared canvas links
CREATE TABLE IF NOT EXISTS shared_links (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_canvases_updated_at ON canvases(updated_at);
CREATE INDEX IF NOT EXISTS idx_canvas_images_canvas_id ON canvas_images(canvas_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_share_token ON shared_links(share_token);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
  AFTER UPDATE ON users
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_canvases_updated_at
  AFTER UPDATE ON canvases
  BEGIN
    UPDATE canvases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;