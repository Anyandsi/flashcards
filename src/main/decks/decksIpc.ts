import { ipcMain } from 'electron';
import type {
  CardContents,
  CreateCardInput,
  CreateDeckInput,
  UpdateCardInput,
  UpdateDeckInput,
} from '../../models/decks';
import { ReviewRating } from '../../models/review';
import { trustedIpcHandler } from '../security/rendererSecurity';
import {
  createCardInDeck,
  createDeck,
  deleteCard,
  deleteDeck,
  getCard,
  getDeck,
  listCardsByDeck,
  listDecks,
  setCardReviewRating,
  updateCard,
  updateDeck,
} from './decksRepository';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function parseOptionalContents(value: unknown): CardContents | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as CardContents;
}

function parseCreateCardInput(value: unknown): CreateCardInput {
  if (!isRecord(value) || typeof value.title !== 'string') {
    throw new Error('Card title is required');
  }

  const title = value.title;

  return {
    contents: parseOptionalContents(value.contents),
    title,
  };
}

function parseUpdateCardInput(value: unknown): UpdateCardInput {
  if (!isRecord(value)) {
    throw new Error('Card update input is required');
  }

  if (value.title !== undefined && typeof value.title !== 'string') {
    throw new Error('Card title must be a string');
  }

  const title = value.title as string | undefined;

  return {
    contents: parseOptionalContents(value.contents),
    title,
  };
}

function parseCreateDeckInput(value: unknown): CreateDeckInput {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.subjectId !== 'string') {
    throw new Error('Deck name and subject id are required');
  }

  const name = value.name;
  const subjectId = value.subjectId;

  return {
    name,
    subjectId,
  };
}

function parseUpdateDeckInput(value: unknown): UpdateDeckInput {
  if (!isRecord(value)) {
    throw new Error('Deck update input is required');
  }

  if (value.name !== undefined && typeof value.name !== 'string') {
    throw new Error('Deck name must be a string');
  }

  if (value.subjectId !== undefined && typeof value.subjectId !== 'string') {
    throw new Error('Deck subject id must be a string');
  }

  const name = value.name as string | undefined;
  const subjectId = value.subjectId as string | undefined;

  return {
    name,
    subjectId,
  };
}

function parseId(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} is required`);
  }

  return value;
}

function parseReviewRating(value: unknown): ReviewRating {
  switch (value) {
    case ReviewRating.Bad:
    case ReviewRating.Good:
    case ReviewRating.Perfect:
      return value;
    default:
      throw new Error('Review rating is invalid');
  }
}

export function registerDeckHandlers() {
  ipcMain.handle(
    'cards:list-by-deck',
    trustedIpcHandler((_event, deckId: unknown) =>
      listCardsByDeck(parseId(deckId, 'Deck id')),
    ),
  );
  ipcMain.handle(
    'cards:get',
    trustedIpcHandler((_event, cardId: unknown) => getCard(parseId(cardId, 'Card id'))),
  );
  ipcMain.handle(
    'cards:create-in-deck',
    trustedIpcHandler((_event, deckId: unknown, input: unknown) =>
      createCardInDeck(parseId(deckId, 'Deck id'), parseCreateCardInput(input)),
    ),
  );
  ipcMain.handle(
    'cards:update',
    trustedIpcHandler((_event, cardId: unknown, input: unknown) =>
      updateCard(parseId(cardId, 'Card id'), parseUpdateCardInput(input)),
    ),
  );
  ipcMain.handle(
    'cards:set-review-rating',
    trustedIpcHandler((_event, cardId: unknown, rating: unknown) =>
      setCardReviewRating(parseId(cardId, 'Card id'), parseReviewRating(rating)),
    ),
  );
  ipcMain.handle(
    'cards:delete',
    trustedIpcHandler((_event, cardId: unknown) => deleteCard(parseId(cardId, 'Card id'))),
  );

  ipcMain.handle('decks:list', trustedIpcHandler(() => listDecks()));
  ipcMain.handle(
    'decks:get',
    trustedIpcHandler((_event, deckId: unknown) => getDeck(parseId(deckId, 'Deck id'))),
  );
  ipcMain.handle(
    'decks:create',
    trustedIpcHandler((_event, input: unknown) => createDeck(parseCreateDeckInput(input))),
  );
  ipcMain.handle(
    'decks:update',
    trustedIpcHandler((_event, deckId: unknown, input: unknown) =>
      updateDeck(parseId(deckId, 'Deck id'), parseUpdateDeckInput(input)),
    ),
  );
  ipcMain.handle(
    'decks:delete',
    trustedIpcHandler((_event, deckId: unknown) => deleteDeck(parseId(deckId, 'Deck id'))),
  );
}
