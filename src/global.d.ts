import type { SaveImageAttachmentInput, SavedImageAttachment } from './models/attachments';
import type { Card, CreateCardInput, CreateDeckInput, Deck, UpdateCardInput, UpdateDeckInput } from './models/decks';
import type { CreateSubjectInput, Session, SessionHistoryItem, Subject } from './models/subjects';

type ElectronApi = {
  attachments: {
    saveImage: (input: SaveImageAttachmentInput) => Promise<SavedImageAttachment>;
  };
  cards: {
    list: () => Promise<Card[]>;
    get: (cardId: string) => Promise<Card>;
    create: (input: CreateCardInput) => Promise<Card>;
    update: (cardId: string, input: UpdateCardInput) => Promise<Card>;
    delete: (cardId: string) => Promise<string>;
  };
  decks: {
    list: () => Promise<Deck[]>;
    get: (deckId: string) => Promise<Deck>;
    create: (input: CreateDeckInput) => Promise<Deck>;
    update: (deckId: string, input: UpdateDeckInput) => Promise<Deck>;
    delete: (deckId: string) => Promise<string>;
  };
  subjects: {
    list: () => Promise<Subject[]>;
    listSessions: () => Promise<SessionHistoryItem[]>;
    create: (input: CreateSubjectInput) => Promise<Subject>;
    getCurrent: () => Promise<string | null>;
    setCurrent: (subjectId: string) => Promise<string>;
    recordSession: (subjectId: string, durationSeconds: number, createdAt?: string) => Promise<Session>;
    deleteSession: (sessionId: string) => Promise<string>;
  };
};

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
