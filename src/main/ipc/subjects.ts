import { ipcMain } from 'electron';
import type { CreateSubjectInput } from '../../models/subjects';
import { createSubject, listSubjects } from '../subjects/subjectsRepository';

function parseCreateSubjectInput(value: unknown): CreateSubjectInput {
  if (
    !value ||
    typeof value !== 'object' ||
    !('name' in value) ||
    typeof value.name !== 'string'
  ) {
    throw new Error('Subject name is required');
  }

  return {
    name: value.name,
  };
}

export function registerSubjectHandlers() {
  ipcMain.handle('subjects:list', () => listSubjects());
  ipcMain.handle('subjects:create', (_event, input: unknown) =>
    createSubject(parseCreateSubjectInput(input)),
  );
}
