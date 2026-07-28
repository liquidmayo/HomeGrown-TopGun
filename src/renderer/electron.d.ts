/** Type declarations for the Electron preload API exposed via contextBridge */
interface ElectronAPI {
  saveGame: (data: string, filePath: string) => Promise<{ success: boolean; error?: string }>;
  loadGame: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
