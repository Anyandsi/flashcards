import { randomUUID } from 'node:crypto';
import type {
  Card,
  CardContents,
  CreateCardInput,
  CreateDeckInput,
  Deck,
  UpdateCardInput,
  UpdateDeckInput,
} from '../../models/decks';
import { getDatabase } from '../db/database';

type CardRow = {
  contents_json: string;
  id: string;
  title: string;
};

type DeckRow = {
  id: string;
  name: string;
  subject_id: string;
};

type DeckCardRow = {
  card_id: string;
  deck_id: string;
};

type IdRow = {
  id: string;
};

const emptyCardContents: CardContents = {
  markdown: '',
  type: 'markdown',
};

function isCardContents(value: unknown): value is CardContents {
  return (
    !!value &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'markdown' &&
    'markdown' in value &&
    typeof value.markdown === 'string'
  );
}

function migrateImageCardContents(value: unknown): CardContents | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('type' in value) ||
    value.type !== 'image' ||
    !('src' in value) ||
    typeof value.src !== 'string'
  ) {
    return null;
  }

  const alt = 'alt' in value && typeof value.alt === 'string' ? value.alt : 'image';

  return {
    markdown: `![${alt}](${value.src})`,
    type: 'markdown',
  };
}

function migrateLegacyCardContents(value: unknown): CardContents | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('type' in value) ||
    value.type !== 'document' ||
    !('blocks' in value) ||
    !Array.isArray(value.blocks)
  ) {
    return null;
  }

  const markdown = value.blocks
    .map((block) => {
      if (block && typeof block === 'object' && 'type' in block && block.type === 'text') {
        return 'text' in block && typeof block.text === 'string' ? block.text : '';
      }

      if (block && typeof block === 'object' && 'type' in block && block.type === 'image') {
        return 'src' in block && typeof block.src === 'string' ? `![image](${block.src})` : '';
      }

      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return {
    markdown,
    type: 'markdown',
  };
}

function parseCardContents(value: string): CardContents {
  const contents = JSON.parse(value) as unknown;

  if (isCardContents(contents)) {
    return contents;
  }

  const imageContents = migrateImageCardContents(contents);

  if (imageContents) {
    return imageContents;
  }

  const legacyContents = migrateLegacyCardContents(contents);

  if (!legacyContents) {
    throw new Error('Stored card contents are invalid');
  }

  return legacyContents;
}

function validateCardContents(contents: CardContents) {
  if (!isCardContents(contents)) {
    throw new Error('Card contents are invalid');
  }
}

function toCard(row: CardRow): Card {
  return {
    contents: parseCardContents(row.contents_json),
    id: row.id,
    title: row.title,
  };
}

function toDeck(row: DeckRow, cardIds: string[]): Deck {
  return {
    cardIds,
    id: row.id,
    name: row.name,
    subjectId: row.subject_id,
  };
}

function getDeckCardIds(deckId: string) {
  return getDatabase()
    .prepare(
      `
      SELECT card_id
      FROM deck_cards
      WHERE deck_id = ?
      ORDER BY position ASC
      `,
    )
    .all(deckId)
    .map((row) => (row as Pick<DeckCardRow, 'card_id'>).card_id);
}

function getDeckCardIdMap(deckIds: string[]) {
  const cardIdsByDeckId = new Map<string, string[]>();

  for (const deckId of deckIds) {
    cardIdsByDeckId.set(deckId, []);
  }

  if (!deckIds.length) {
    return cardIdsByDeckId;
  }

  const placeholders = deckIds.map(() => '?').join(', ');
  const rows = getDatabase()
    .prepare(
      `
      SELECT deck_id, card_id
      FROM deck_cards
      WHERE deck_id IN (${placeholders})
      ORDER BY deck_id ASC, position ASC
      `,
    )
    .all(...deckIds) as DeckCardRow[];

  for (const row of rows) {
    cardIdsByDeckId.get(row.deck_id)?.push(row.card_id);
  }

  return cardIdsByDeckId;
}

function requireSubject(subjectId: string) {
  const subject = getDatabase()
    .prepare('SELECT id FROM subjects WHERE id = ?')
    .get(subjectId) as IdRow | undefined;

  if (!subject) {
    throw new Error('Subject does not exist');
  }
}

function getUniqueCardIds(cardIds: string[]) {
  return Array.from(new Set(cardIds));
}

function requireCards(cardIds: string[]) {
  const uniqueCardIds = getUniqueCardIds(cardIds);

  if (!uniqueCardIds.length) {
    return;
  }

  const placeholders = uniqueCardIds.map(() => '?').join(', ');
  const storedCardIds = getDatabase()
    .prepare(`SELECT id FROM cards WHERE id IN (${placeholders})`)
    .all(...uniqueCardIds)
    .map((row) => (row as IdRow).id);

  if (storedCardIds.length !== uniqueCardIds.length) {
    throw new Error('One or more cards do not exist');
  }
}

function replaceDeckCardIds(deckId: string, cardIds: string[]) {
  const db = getDatabase();
  const uniqueCardIds = getUniqueCardIds(cardIds);

  db.prepare('DELETE FROM deck_cards WHERE deck_id = ?').run(deckId);

  const insertCard = db.prepare(
    `
    INSERT INTO deck_cards (deck_id, card_id, position)
    VALUES (?, ?, ?)
    `,
  );

  uniqueCardIds.forEach((cardId, position) => {
    insertCard.run(deckId, cardId, position);
  });
}

export function listCards(): Card[] {
  const rows = getDatabase()
    .prepare(
      `
      SELECT id, title, contents_json
      FROM cards
      ORDER BY title COLLATE NOCASE ASC
      `,
    )
    .all() as CardRow[];

  return rows.map(toCard);
}

export function getCard(cardId: string): Card {
  const row = getDatabase()
    .prepare('SELECT id, title, contents_json FROM cards WHERE id = ?')
    .get(cardId) as CardRow | undefined;

  if (!row) {
    throw new Error('Card does not exist');
  }

  return toCard(row);
}

export function createCard(input: CreateCardInput): Card {
  const title = input.title.trim();
  const contents = input.contents ?? emptyCardContents;

  if (!title) {
    throw new Error('Card title is required');
  }

  validateCardContents(contents);

  const card: Card = {
    contents,
    id: randomUUID(),
    title,
  };

  getDatabase()
    .prepare(
      `
      INSERT INTO cards (id, title, contents_json)
      VALUES (@id, @title, @contentsJson)
      `,
    )
    .run({
      contentsJson: JSON.stringify(card.contents),
      id: card.id,
      title: card.title,
    });

  return card;
}

export function updateCard(cardId: string, input: UpdateCardInput): Card {
  const existingCard = getCard(cardId);
  const nextTitle = input.title === undefined ? existingCard.title : input.title.trim();
  const nextContents = input.contents ?? existingCard.contents;

  if (!nextTitle) {
    throw new Error('Card title is required');
  }

  validateCardContents(nextContents);

  getDatabase()
    .prepare(
      `
      UPDATE cards
      SET title = @title,
          contents_json = @contentsJson
      WHERE id = @id
      `,
    )
    .run({
      contentsJson: JSON.stringify(nextContents),
      id: cardId,
      title: nextTitle,
    });

  return getCard(cardId);
}

export function deleteCard(cardId: string): string {
  const result = getDatabase().prepare('DELETE FROM cards WHERE id = ?').run(cardId);

  if (!result.changes) {
    throw new Error('Card does not exist');
  }

  return cardId;
}

export function listDecks(): Deck[] {
  const rows = getDatabase()
    .prepare(
      `
      SELECT id, name, subject_id
      FROM decks
      ORDER BY name COLLATE NOCASE ASC
      `,
    )
    .all() as DeckRow[];
  const cardIdsByDeckId = getDeckCardIdMap(rows.map((row) => row.id));

  return rows.map((row) => toDeck(row, cardIdsByDeckId.get(row.id) ?? []));
}

export function getDeck(deckId: string): Deck {
  const row = getDatabase()
    .prepare('SELECT id, name, subject_id FROM decks WHERE id = ?')
    .get(deckId) as DeckRow | undefined;

  if (!row) {
    throw new Error('Deck does not exist');
  }

  return toDeck(row, getDeckCardIds(deckId));
}

export function createDeck(input: CreateDeckInput): Deck {
  const name = input.name.trim();
  const cardIds = input.cardIds ?? [];

  if (!name) {
    throw new Error('Deck name is required');
  }

  requireSubject(input.subjectId);
  requireCards(cardIds);

  const deckId = randomUUID();
  const db = getDatabase();
  const createStoredDeck = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO decks (id, name, subject_id)
      VALUES (?, ?, ?)
      `,
    ).run(deckId, name, input.subjectId);
    replaceDeckCardIds(deckId, cardIds);
  });

  createStoredDeck();

  return getDeck(deckId);
}

export function updateDeck(deckId: string, input: UpdateDeckInput): Deck {
  const existingDeck = getDeck(deckId);
  const nextName = input.name === undefined ? existingDeck.name : input.name.trim();
  const nextSubjectId = input.subjectId ?? existingDeck.subjectId;
  const nextCardIds = input.cardIds ?? existingDeck.cardIds;

  if (!nextName) {
    throw new Error('Deck name is required');
  }

  requireSubject(nextSubjectId);
  requireCards(nextCardIds);

  const db = getDatabase();
  const updateStoredDeck = db.transaction(() => {
    db.prepare(
      `
      UPDATE decks
      SET name = ?,
          subject_id = ?
      WHERE id = ?
      `,
    ).run(nextName, nextSubjectId, deckId);
    replaceDeckCardIds(deckId, nextCardIds);
  });

  updateStoredDeck();

  return getDeck(deckId);
}

export function deleteDeck(deckId: string): string {
  const result = getDatabase().prepare('DELETE FROM decks WHERE id = ?').run(deckId);

  if (!result.changes) {
    throw new Error('Deck does not exist');
  }

  return deckId;
}
