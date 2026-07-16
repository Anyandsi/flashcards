import { ipcMain } from 'electron';
import { trustedIpcHandler } from '../security/rendererSecurity';
import { getSubjectReviewProgress } from './reviewRepository';

export function registerReviewHandlers() {
  ipcMain.handle(
    'review:get-subject-progress',
    trustedIpcHandler((_event, subjectId: unknown) => {
      if (typeof subjectId !== 'string') {
        throw new Error('Subject id is required');
      }

      return getSubjectReviewProgress(subjectId);
    }),
  );
}
