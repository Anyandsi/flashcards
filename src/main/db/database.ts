import Database from 'better-sqlite3';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let database: Database.Database | null = null;

type LegacyCardOwnershipRow = {
  contents_json: string;
  deck_id: string | null;
  id: string;
  position: number | null;
  title: string;
};

type IdRow = {
  id: string;
};

function tableExists(db: Database.Database, tableName: string) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
}

function createRecoveryDeck(db: Database.Database) {
  let subject = db.prepare('SELECT id FROM subjects ORDER BY name COLLATE NOCASE LIMIT 1').get() as
    | IdRow
    | undefined;

  if (!subject) {
    subject = { id: randomUUID() };
    db.prepare('INSERT INTO subjects (id, name, time_spent) VALUES (?, ?, 0)').run(
      subject.id,
      'Recovered',
    );
    db.prepare(
      `
      INSERT INTO app_settings (key, value)
      VALUES ('current_subject_id', ?)
      ON CONFLICT(key) DO NOTHING
      `,
    ).run(subject.id);
  }

  const deckId = randomUUID();

  db.prepare('INSERT INTO decks (id, name, subject_id) VALUES (?, ?, ?)').run(
    deckId,
    'Recovered cards',
    subject.id,
  );

  return deckId;
}

function migrateCardsToDeckOwnership(db: Database.Database) {
  const cardColumns = db.prepare('PRAGMA table_info(cards)').all() as Array<{ name: string }>;
  const hasDeckId = cardColumns.some((column) => column.name === 'deck_id');
  const hasPosition = cardColumns.some((column) => column.name === 'position');

  if (hasDeckId) {
    if (!hasPosition) {
      db.exec('ALTER TABLE cards ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
    }

    return;
  }

  const hasDeckCards = tableExists(db, 'deck_cards');
  const legacyCards = (hasDeckCards
    ? db
        .prepare(
          `
          SELECT cards.id, cards.title, cards.contents_json, deck_cards.deck_id, deck_cards.position
          FROM cards
          LEFT JOIN deck_cards ON deck_cards.card_id = cards.id
          ORDER BY cards.id, deck_cards.position, deck_cards.deck_id
          `,
        )
        .all()
    : db
        .prepare(
          `
          SELECT id, title, contents_json, NULL AS deck_id, NULL AS position
          FROM cards
          ORDER BY id
          `,
        )
        .all()) as LegacyCardOwnershipRow[];

  const migrateStoredCards = db.transaction(() => {
    db.exec(`
      CREATE TABLE cards_with_deck_ownership (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        contents_json TEXT NOT NULL,
        deck_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    const insertCard = db.prepare(
      `
      INSERT INTO cards_with_deck_ownership
        (id, title, contents_json, deck_id, position)
      VALUES
        (@id, @title, @contentsJson, @deckId, @position)
      `,
    );
    const migratedCardIds = new Set<string>();
    let recoveryDeckId: string | null = null;
    let recoveryPosition = 0;

    for (const legacyCard of legacyCards) {
      if (!legacyCard.deck_id && !recoveryDeckId) {
        recoveryDeckId = createRecoveryDeck(db);
      }

      insertCard.run({
        contentsJson: legacyCard.contents_json,
        deckId: legacyCard.deck_id ?? recoveryDeckId,
        id: migratedCardIds.has(legacyCard.id) ? randomUUID() : legacyCard.id,
        position: legacyCard.position ?? recoveryPosition++,
        title: legacyCard.title,
      });
      migratedCardIds.add(legacyCard.id);
    }

    if (hasDeckCards) {
      db.exec('DROP TABLE deck_cards');
    }

    db.exec(`
      DROP TABLE cards;
      ALTER TABLE cards_with_deck_ownership RENAME TO cards;
    `);
  });

  migrateStoredCards();
}

function migrateCardReviewRating(db: Database.Database) {
  const cardColumns = db.prepare('PRAGMA table_info(cards)').all() as Array<{ name: string }>;

  if (!cardColumns.some((column) => column.name === 'review_rating')) {
    db.exec('ALTER TABLE cards ADD COLUMN review_rating TEXT');
  }

  if (!cardColumns.some((column) => column.name === 'last_review_date')) {
    db.exec('ALTER TABLE cards ADD COLUMN last_review_date TEXT');
  }
}

export function migrateDatabase(db: Database.Database) {
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

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      contents_json TEXT NOT NULL,
      deck_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      review_rating TEXT,
      last_review_date TEXT,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
  `);

  const subjectColumns = db.prepare('PRAGMA table_info(subjects)').all() as Array<{ name: string }>;

  if (!subjectColumns.some((column) => column.name === 'time_spent')) {
    db.exec('ALTER TABLE subjects ADD COLUMN time_spent INTEGER NOT NULL DEFAULT 0');
  }

  migrateCardsToDeckOwnership(db);
  migrateCardReviewRating(db);
  db.exec(`
    CREATE INDEX IF NOT EXISTS cards_deck_id_position_index
      ON cards(deck_id, position);
  `);
}

export function getDatabase() {
  if (!database) {
    const databaseDirectory = app.getPath('userData');
    fs.mkdirSync(databaseDirectory, { recursive: true });

    database = new Database(path.join(databaseDirectory, 'flashcards.sqlite'));
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    migrateDatabase(database);
  }

  return database;
}

export function closeDatabase() {
  database?.close();
  database = null;
}
