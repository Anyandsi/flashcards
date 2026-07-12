// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { CreateSubjectInput, Session, SessionHistoryItem, Subject } from './models/subjects';

contextBridge.exposeInMainWorld('api', {
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
