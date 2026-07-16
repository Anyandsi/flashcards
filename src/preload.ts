// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { SaveImageAttachmentInput, SavedImageAttachment } from './models/attachments';
import type { Card, CreateCardInput, CreateDeckInput, Deck, UpdateCardInput, UpdateDeckInput } from './models/decks';
import type { CreateSubjectInput, Session, SessionHistoryItem, Subject } from './models/subjects';

contextBridge.exposeInMainWorld('api', {
  attachments: {
    saveImage: (input: SaveImageAttachmentInput) =>
      ipcRenderer.invoke('attachments:save-image', input) as Promise<SavedImageAttachment>,
  },
  cards: {
    listByDeck: (deckId: string) =>
      ipcRenderer.invoke('cards:list-by-deck', deckId) as Promise<Card[]>,
    get: (cardId: string) => ipcRenderer.invoke('cards:get', cardId) as Promise<Card>,
    createInDeck: (deckId: string, input: CreateCardInput) =>
      ipcRenderer.invoke('cards:create-in-deck', deckId, input) as Promise<Card>,
    update: (cardId: string, input: UpdateCardInput) =>
      ipcRenderer.invoke('cards:update', cardId, input) as Promise<Card>,
    delete: (cardId: string) => ipcRenderer.invoke('cards:delete', cardId) as Promise<string>,
  },
  decks: {
    list: () => ipcRenderer.invoke('decks:list') as Promise<Deck[]>,
    get: (deckId: string) => ipcRenderer.invoke('decks:get', deckId) as Promise<Deck>,
    create: (input: CreateDeckInput) => ipcRenderer.invoke('decks:create', input) as Promise<Deck>,
    update: (deckId: string, input: UpdateDeckInput) =>
      ipcRenderer.invoke('decks:update', deckId, input) as Promise<Deck>,
    delete: (deckId: string) => ipcRenderer.invoke('decks:delete', deckId) as Promise<string>,
  },
  subjects: {
    list: () => ipcRenderer.invoke('subjects:list') as Promise<Subject[]>,
    listSessions: () =>
      ipcRenderer.invoke('subjects:list-sessions') as Promise<SessionHistoryItem[]>,
    create: (input: CreateSubjectInput) =>
      ipcRenderer.invoke('subjects:create', input) as Promise<Subject>,
    getCurrent: () => ipcRenderer.invoke('subjects:get-current') as Promise<string | null>,
    setCurrent: (subjectId: string) =>
      ipcRenderer.invoke('subjects:set-current', subjectId) as Promise<string>,
    recordSession: (subjectId: string, durationSeconds: number, createdAt?: string) =>
      ipcRenderer.invoke('subjects:record-session', subjectId, durationSeconds, createdAt) as Promise<Session>,
    deleteSession: (sessionId: string) =>
      ipcRenderer.invoke('subjects:delete-session', sessionId) as Promise<string>,
  },
});
