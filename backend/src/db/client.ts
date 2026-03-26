import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Resolve DB path relative to the backend package root (one level above src/)
  const backendRoot = path.resolve(__dirname, '../..');
  const dbPath = path.isAbsolute(config.dbPath)
    ? config.dbPath
    : path.resolve(backendRoot, config.dbPath);

  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(dbPath, {
    verbose: config.nodeEnv === 'development' ? undefined : undefined,
  });

  // WAL pragmas FIRST — critical for concurrent reads + write performance
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('busy_timeout = 5000');   // wait 5s if DB locked (MCP server writing)
  _db.pragma('cache_size = -64000');   // 64MB cache
  _db.pragma('foreign_keys = ON');
  _db.pragma('temp_store = MEMORY');
  _db.pragma('mmap_size = 268435456'); // 256MB mmap

  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
