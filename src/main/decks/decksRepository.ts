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
import type { DeletionReceipt } from '../../models/deletions';
import { ReviewRating } from '../../models/review';
import { getDatabase } from '../db/database';
import { createDeletionReceipt } from '../deletions/deletionsRepository';

type CardRow = {
  contents_json: string;
  deck_id: string;
  id: string;
  last_review_date: string | null;
  review_rating: string | null;
  title: string;
};

type StoredCardRow = CardRow & {
  position: number;
};

type StoredDeckRow = {
  id: string;
  name: string;
  subject_id: string;
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

function parseStoredReviewRating(value: string | null): ReviewRating | null {
  switch (value) {
    case null:
      return null;
    case ReviewRating.Bad:
    case ReviewRating.Good:
    case ReviewRating.Perfect:
      return value;
    default:
      throw new Error('Stored card review rating is invalid');
  }
}

function toCard(row: CardRow): Card {
  return {
    contents: parseCardContents(row.contents_json),
    deckId: row.deck_id,
    id: row.id,
    lastReviewDate: row.last_review_date,
    reviewRating: parseStoredReviewRating(row.review_rating),
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
    lastReviewDate: null,
    reviewRating: null,
    title,
  };
}

export function listCardsByDeck(deckId: string): Card[] {
  const db = getDatabase();

  requireDeck(db, deckId);

  const rows = db
    .prepare(
      `
      SELECT id, title, contents_json, deck_id, review_rating, last_review_date
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
    .prepare(
      `
      SELECT id, title, contents_json, deck_id, review_rating, last_review_date
      FROM cards
      WHERE id = ?
      `,
    )
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
      INSERT INTO cards
        (id, title, contents_json, deck_id, position, review_rating, last_review_date)
      VALUES
        (@id, @title, @contentsJson, @deckId, @position, @reviewRating, @lastReviewDate)
      `,
    ).run({
      contentsJson: JSON.stringify(card.contents),
      deckId: card.deckId,
      id: card.id,
      lastReviewDate: card.lastReviewDate,
      position: nextPosition,
      reviewRating: card.reviewRating,
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

export function setCardReviewRating(cardId: string, rating: ReviewRating): Card {
  const result = getDatabase()
    .prepare(
      `
      UPDATE cards
      SET review_rating = @rating,
          last_review_date = @lastReviewDate
      WHERE id = @cardId
      `,
    )
    .run({
      cardId,
      lastReviewDate: new Date().toISOString(),
      rating,
    });

  if (!result.changes) {
    throw new Error('Card does not exist');
  }

  return getCard(cardId);
}

export function deleteCard(cardId: string): DeletionReceipt {
  const db = getDatabase();
  const card = db
    .prepare(
      `
      SELECT id, title, contents_json, deck_id, position, review_rating, last_review_date
      FROM cards
      WHERE id = ?
      `,
    )
    .get(cardId) as StoredCardRow | undefined;

  if (!card) {
    throw new Error('Card does not exist');
  }

  db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);

  return createDeletionReceipt('card', card.title, () => {
    requireDeck(db, card.deck_id);
    db.prepare(
      `
      INSERT INTO cards
        (id, title, contents_json, deck_id, position, review_rating, last_review_date)
      VALUES
        (@id, @title, @contents_json, @deck_id, @position, @review_rating, @last_review_date)
      `,
    ).run(card);
  });
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

export function deleteDeck(deckId: string): DeletionReceipt {
  const db = getDatabase();
  const deck = db
    .prepare('SELECT id, name, subject_id FROM decks WHERE id = ?')
    .get(deckId) as StoredDeckRow | undefined;

  if (!deck) {
    throw new Error('Deck does not exist');
  }

  const cards = db
    .prepare(
      `
      SELECT id, title, contents_json, deck_id, position, review_rating, last_review_date
      FROM cards
      WHERE deck_id = ?
      ORDER BY position ASC
      `,
    )
    .all(deckId) as StoredCardRow[];

  db.prepare('DELETE FROM decks WHERE id = ?').run(deckId);

  return createDeletionReceipt('topic', deck.name, () => {
    const restoreDeck = db.transaction(() => {
      const subjectExists = db.prepare('SELECT id FROM subjects WHERE id = ?').get(deck.subject_id);

      if (!subjectExists) {
        throw new Error('The topic cannot be restored because its subject no longer exists');
      }

      db.prepare('INSERT INTO decks (id, name, subject_id) VALUES (@id, @name, @subject_id)').run(deck);
      const insertCard = db.prepare(
        `
        INSERT INTO cards
          (id, title, contents_json, deck_id, position, review_rating, last_review_date)
        VALUES
          (@id, @title, @contents_json, @deck_id, @position, @review_rating, @last_review_date)
        `,
      );

      for (const card of cards) {
        insertCard.run(card);
      }
    });

    restoreDeck();
  });
}
