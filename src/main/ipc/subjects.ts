import { ipcMain } from 'electron';
import type { CreateSubjectInput } from '../../models/subjects';
import {
  createSubject,
  getCurrentSubjectId,
  listSubjects,
  setCurrentSubjectId,
} from '../subjects/subjectsRepository';

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
  ipcMain.handle('subjects:get-current', () => getCurrentSubjectId());
  ipcMain.handle('subjects:set-current', (_event, subjectId: unknown) => {
    if (typeof subjectId !== 'string') {
      throw new Error('Subject id is required');
    }

    return setCurrentSubjectId(subjectId);
  });
}
