import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveGame: (data: string, filePath: string) =>
    ipcRenderer.invoke('save-game', data, filePath),
  loadGame: (filePath: string) =>
    ipcRenderer.invoke('load-game', filePath),
});
