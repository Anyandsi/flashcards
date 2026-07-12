import type { CreateSubjectInput, Subject } from './models/subjects';

type ElectronApi = {
  subjects: {
    list: () => Promise<Subject[]>;
    create: (input: CreateSubjectInput) => Promise<Subject>;
    getCurrent: () => Promise<string | null>;
    setCurrent: (subjectId: string) => Promise<string>;
  };
};

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
