import type { SaveImageAttachmentInput, SavedImageAttachment } from './models/attachments';
import type { Card, CreateCardInput, CreateDeckInput, Deck, UpdateCardInput, UpdateDeckInput } from './models/decks';
import type { DeletionReceipt } from './models/deletions';
import type { CreateSubjectInput, Session, SessionHistoryItem, Subject } from './models/subjects';
import type { ReviewRating, SubjectReviewProgress } from './models/review';

type ElectronApi = {
  attachments: {
    saveImage: (input: SaveImageAttachmentInput) => Promise<SavedImageAttachment>;
  };
  cards: {
    listByDeck: (deckId: string) => Promise<Card[]>;
    get: (cardId: string) => Promise<Card>;
    createInDeck: (deckId: string, input: CreateCardInput) => Promise<Card>;
    update: (cardId: string, input: UpdateCardInput) => Promise<Card>;
    setReviewRating: (cardId: string, rating: ReviewRating) => Promise<Card>;
    delete: (cardId: string) => Promise<DeletionReceipt>;
  };
  decks: {
    list: () => Promise<Deck[]>;
    get: (deckId: string) => Promise<Deck>;
    create: (input: CreateDeckInput) => Promise<Deck>;
    update: (deckId: string, input: UpdateDeckInput) => Promise<Deck>;
    delete: (deckId: string) => Promise<DeletionReceipt>;
  };
  deletions: {
    undo: (deletionId: string) => Promise<DeletionReceipt>;
  };
  review: {
    getSubjectProgress: (subjectId: string) => Promise<SubjectReviewProgress>;
  };
  subjects: {
    list: () => Promise<Subject[]>;
    listSessions: () => Promise<SessionHistoryItem[]>;
    create: (input: CreateSubjectInput) => Promise<Subject>;
    delete: (subjectId: string) => Promise<DeletionReceipt>;
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
