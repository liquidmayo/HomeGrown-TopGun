import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    title: 'Red Storm',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.VITE_DEV_PORT || '5190';
    mainWindow.loadURL(`http://localhost:${port}`);
    if (!process.env.SCREENSHOT_MODE) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();

  // Auto-screenshot mode: capture after page loads, then quit
  if (process.env.SCREENSHOT_MODE) {
    mainWindow!.webContents.on('did-finish-load', async () => {
      // Wait for PixiJS to render
      await new Promise((r) => setTimeout(r, 3000));

      // Click "New Game (RS1)" button via JS
      await mainWindow!.webContents.executeJavaScript(`
        const buttons = document.querySelectorAll('button');
        for (const b of buttons) {
          if (b.textContent.includes('New Game')) { b.click(); break; }
        }
      `);
      await new Promise((r) => setTimeout(r, 2000));

      // Advance through phases: Setup -> Jamming -> Detection (stop here)
      await mainWindow!.webContents.executeJavaScript(`
        (function() {
          function clickNext() {
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
              if (b.textContent && b.textContent.includes('Next Phase')) { b.click(); return true; }
            }
            return false;
          }
          clickNext(); // Setup -> Jamming
          setTimeout(() => clickNext(), 300); // Jamming -> Detection
        })();
      `);

      await new Promise((r) => setTimeout(r, 2000));

      // Capture screenshot
      const image = await mainWindow!.webContents.capturePage();
      const screenshotPath = path.join(process.cwd(), 'screenshot.png');
      await fs.promises.writeFile(screenshotPath, image.toPNG());
      console.log('Screenshot saved to:', screenshotPath);
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for file operations (save/load)
ipcMain.handle('save-game', async (_event, data: string, filePath: string) => {
  try {
    await fs.promises.writeFile(filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-game', async (_event, filePath: string) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
