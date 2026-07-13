import { ipcMain } from 'electron';
import type {
  CardContents,
  CreateCardInput,
  CreateDeckInput,
  UpdateCardInput,
  UpdateDeckInput,
} from '../../models/decks';
import {
  createCard,
  createDeck,
  deleteCard,
  deleteDeck,
  getCard,
  getDeck,
  listCards,
  listDecks,
  updateCard,
  updateDeck,
} from './decksRepository';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function parseOptionalCardIds(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((cardId) => typeof cardId === 'string')) {
    throw new Error('Deck card ids must be a list of strings');
  }

  return value as string[];
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
    cardIds: parseOptionalCardIds(value.cardIds),
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
    cardIds: parseOptionalCardIds(value.cardIds),
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

export function registerDeckHandlers() {
  ipcMain.handle('cards:list', () => listCards());
  ipcMain.handle('cards:get', (_event, cardId: unknown) => getCard(parseId(cardId, 'Card id')));
  ipcMain.handle('cards:create', (_event, input: unknown) =>
    createCard(parseCreateCardInput(input)),
  );
  ipcMain.handle('cards:update', (_event, cardId: unknown, input: unknown) =>
    updateCard(parseId(cardId, 'Card id'), parseUpdateCardInput(input)),
  );
  ipcMain.handle('cards:delete', (_event, cardId: unknown) =>
    deleteCard(parseId(cardId, 'Card id')),
  );

  ipcMain.handle('decks:list', () => listDecks());
  ipcMain.handle('decks:get', (_event, deckId: unknown) => getDeck(parseId(deckId, 'Deck id')));
  ipcMain.handle('decks:create', (_event, input: unknown) =>
    createDeck(parseCreateDeckInput(input)),
  );
  ipcMain.handle('decks:update', (_event, deckId: unknown, input: unknown) =>
    updateDeck(parseId(deckId, 'Deck id'), parseUpdateDeckInput(input)),
  );
  ipcMain.handle('decks:delete', (_event, deckId: unknown) =>
    deleteDeck(parseId(deckId, 'Deck id')),
  );
}
