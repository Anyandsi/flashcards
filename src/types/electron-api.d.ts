import type { CreateSubjectInput, Subject } from '../models/subjects';

type ElectronApi = {
  subjects: {
    list: () => Promise<Subject[]>;
    create: (input: CreateSubjectInput) => Promise<Subject>;
  };
};

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
