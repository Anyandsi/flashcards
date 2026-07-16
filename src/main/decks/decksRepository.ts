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
  deck_id: string;
  id: string;
  title: string;
};

type DeckRow = {
  card_count: number;
  id: string;
  name: string;
  subject_id: string;
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
    deckId: row.deck_id,
    id: row.id,
    title: row.title,
  };
}

function toDeck(row: DeckRow): Deck {
  return {
    cardCount: row.card_count,
    id: row.id,
    name: row.name,
    subjectId: row.subject_id,
  };
}

function requireSubject(subjectId: string) {
  const subject = getDatabase()
    .prepare('SELECT id FROM subjects WHERE id = ?')
    .get(subjectId) as IdRow | undefined;

  if (!subject) {
    throw new Error('Subject does not exist');
  }
}

function requireDeck(database: ReturnType<typeof getDatabase>, deckId: string) {
  const deck = database
    .prepare('SELECT id FROM decks WHERE id = ?')
    .get(deckId) as IdRow | undefined;

  if (!deck) {
    throw new Error('Deck does not exist');
  }
}

function buildCard(deckId: string, input: CreateCardInput): Card {
  const title = input.title.trim();
  const contents = input.contents ?? emptyCardContents;

  if (!title) {
    throw new Error('Card title is required');
  }

  validateCardContents(contents);

  return {
    contents,
    deckId,
    id: randomUUID(),
    title,
  };
}

export function listCardsByDeck(deckId: string): Card[] {
  const db = getDatabase();

  requireDeck(db, deckId);

  const rows = db
    .prepare(
      `
      SELECT id, title, contents_json, deck_id
      FROM cards
      WHERE deck_id = ?
      ORDER BY position ASC
      `,
    )
    .all(deckId) as CardRow[];

  return rows.map(toCard);
}

export function getCard(cardId: string): Card {
  const row = getDatabase()
    .prepare('SELECT id, title, contents_json, deck_id FROM cards WHERE id = ?')
    .get(cardId) as CardRow | undefined;

  if (!row) {
    throw new Error('Card does not exist');
  }

  return toCard(row);
}

export function createCardInDeck(deckId: string, input: CreateCardInput): Card {
  const card = buildCard(deckId, input);
  const db = getDatabase();
  const createStoredCard = db.transaction(() => {
    requireDeck(db, deckId);

    const nextPosition = db
      .prepare(
        `
        SELECT COALESCE(MAX(position), -1) + 1 AS position
        FROM cards
        WHERE deck_id = ?
        `,
      )
      .pluck()
      .get(deckId) as number;

    db.prepare(
      `
      INSERT INTO cards (id, title, contents_json, deck_id, position)
      VALUES (@id, @title, @contentsJson, @deckId, @position)
      `,
    ).run({
      contentsJson: JSON.stringify(card.contents),
      deckId: card.deckId,
      id: card.id,
      position: nextPosition,
      title: card.title,
    });
  });

  createStoredCard();

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
      SELECT decks.id, decks.name, decks.subject_id, COUNT(cards.id) AS card_count
      FROM decks
      LEFT JOIN cards ON cards.deck_id = decks.id
      GROUP BY decks.id, decks.name, decks.subject_id
      ORDER BY decks.name COLLATE NOCASE ASC
      `,
    )
    .all() as DeckRow[];

  return rows.map(toDeck);
}

export function getDeck(deckId: string): Deck {
  const row = getDatabase()
    .prepare(
      `
      SELECT decks.id, decks.name, decks.subject_id, COUNT(cards.id) AS card_count
      FROM decks
      LEFT JOIN cards ON cards.deck_id = decks.id
      WHERE decks.id = ?
      GROUP BY decks.id, decks.name, decks.subject_id
      `,
    )
    .get(deckId) as DeckRow | undefined;

  if (!row) {
    throw new Error('Deck does not exist');
  }

  return toDeck(row);
}

export function createDeck(input: CreateDeckInput): Deck {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Deck name is required');
  }

  requireSubject(input.subjectId);

  const deckId = randomUUID();

  getDatabase()
    .prepare('INSERT INTO decks (id, name, subject_id) VALUES (?, ?, ?)')
    .run(deckId, name, input.subjectId);

  return getDeck(deckId);
}

export function updateDeck(deckId: string, input: UpdateDeckInput): Deck {
  const existingDeck = getDeck(deckId);
  const nextName = input.name === undefined ? existingDeck.name : input.name.trim();
  const nextSubjectId = input.subjectId ?? existingDeck.subjectId;

  if (!nextName) {
    throw new Error('Deck name is required');
  }

  requireSubject(nextSubjectId);

  getDatabase()
    .prepare(
      `
      UPDATE decks
      SET name = ?,
          subject_id = ?
      WHERE id = ?
      `,
    )
    .run(nextName, nextSubjectId, deckId);

  return getDeck(deckId);
}

export function deleteDeck(deckId: string): string {
  const result = getDatabase().prepare('DELETE FROM decks WHERE id = ?').run(deckId);

  if (!result.changes) {
    throw new Error('Deck does not exist');
  }

  return deckId;
}
