import { ipcMain } from 'electron';
import type { CreateSubjectInput } from '../../models/subjects';
import { trustedIpcHandler } from '../security/rendererSecurity';
import {
  createSubject,
  deleteSubject,
  deleteSession,
  getCurrentSubjectId,
  listSessions,
  listSubjects,
  recordSubjectSession,
  setCurrentSubjectId,
} from './subjectsRepository';

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
  ipcMain.handle('subjects:list', trustedIpcHandler(() => listSubjects()));
  ipcMain.handle('subjects:list-sessions', trustedIpcHandler(() => listSessions()));
  ipcMain.handle(
    'subjects:create',
    trustedIpcHandler((_event, input: unknown) =>
      createSubject(parseCreateSubjectInput(input)),
    ),
  );
  ipcMain.handle(
    'subjects:delete',
    trustedIpcHandler((_event, subjectId: unknown) => {
      if (typeof subjectId !== 'string') {
        throw new Error('Subject id is required');
      }

      return deleteSubject(subjectId);
    }),
  );
  ipcMain.handle('subjects:get-current', trustedIpcHandler(() => getCurrentSubjectId()));
  ipcMain.handle(
    'subjects:set-current',
    trustedIpcHandler((_event, subjectId: unknown) => {
      if (typeof subjectId !== 'string') {
        throw new Error('Subject id is required');
      }

      return setCurrentSubjectId(subjectId);
    }),
  );
  ipcMain.handle(
    'subjects:record-session',
    trustedIpcHandler(
      (_event, subjectId: unknown, durationSeconds: unknown, createdAt: unknown) => {
        if (typeof subjectId !== 'string') {
          throw new Error('Subject id is required');
        }

        if (typeof durationSeconds !== 'number') {
          throw new Error('Session duration is required');
        }

        if (createdAt !== undefined && typeof createdAt !== 'string') {
          throw new Error('Session date is invalid');
        }

        return recordSubjectSession(subjectId, durationSeconds, createdAt as string | undefined);
      },
    ),
  );
  ipcMain.handle(
    'subjects:delete-session',
    trustedIpcHandler((_event, sessionId: unknown) => {
      if (typeof sessionId !== 'string') {
        throw new Error('Session id is required');
      }

      return deleteSession(sessionId);
    }),
  );
}
