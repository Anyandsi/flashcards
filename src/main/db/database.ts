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
      created_at TEXT NOT NULL
    );
  `);
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
