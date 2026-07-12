// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { CreateSubjectInput, Subject } from './models/subjects';

contextBridge.exposeInMainWorld('api', {
  subjects: {
    list: () => ipcRenderer.invoke('subjects:list') as Promise<Subject[]>,
    create: (input: CreateSubjectInput) =>
      ipcRenderer.invoke('subjects:create', input) as Promise<Subject>,
  },
});
