import { ipcMain } from 'electron';
import { trustedIpcHandler } from '../security/rendererSecurity';
import { undoDeletion } from './deletionsRepository';

export function registerDeletionHandlers() {
  ipcMain.handle(
    'deletions:undo',
    trustedIpcHandler((_event, deletionId: unknown) => {
      if (typeof deletionId !== 'string') {
        throw new Error('Deletion id is required');
      }

      return undoDeletion(deletionId);
    }),
  );
}
