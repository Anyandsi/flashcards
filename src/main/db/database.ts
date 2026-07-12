import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let database: Database.Database | null = null;

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      time_spent INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const subjectColumns = db.prepare('PRAGMA table_info(subjects)').all() as Array<{ name: string }>;

  if (!subjectColumns.some((column) => column.name === 'time_spent')) {
    db.exec('ALTER TABLE subjects ADD COLUMN time_spent INTEGER NOT NULL DEFAULT 0');
  }
}

export function getDatabase() {
  if (!database) {
    const databaseDirectory = app.getPath('userData');
    fs.mkdirSync(databaseDirectory, { recursive: true });

    database = new Database(path.join(databaseDirectory, 'flashcards.sqlite'));
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    migrate(database);
  }

  return database;
}

export function closeDatabase() {
  database?.close();
  database = null;
}
