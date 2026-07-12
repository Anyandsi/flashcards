import type { CreateSubjectInput, Session, SessionHistoryItem, Subject } from './models/subjects';

type ElectronApi = {
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
