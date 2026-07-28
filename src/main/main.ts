import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

// Disable GPU acceleration to prevent crashes on some systems
app.disableHardwareAcceleration();

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
    const port = process.env.VITE_DEV_PORT || '5200';
    mainWindow.loadURL(`http://localhost:${port}`);
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

  // Auto-screenshot mode: capture sequence of screenshots
  if (process.env.SCREENSHOT_MODE) {
    mainWindow!.webContents.on('did-finish-load', async () => {
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const capture = async (name: string) => {
        const image = await mainWindow!.webContents.capturePage();
        const p = path.join(process.cwd(), `screenshot_${name}.png`);
        await fs.promises.writeFile(p, image.toPNG());
        console.log(`Saved: ${name}`);
      };
      const click = async (text: string) => {
        await mainWindow!.webContents.executeJavaScript(`
          (function() {
            const els = document.querySelectorAll('button, div, span');
            for (const el of els) {
              if (el.textContent && el.textContent.trim() === '${text}') { el.click(); return true; }
            }
            // Try partial match
            for (const el of els) {
              if (el.textContent && el.textContent.includes('${text}')) { el.click(); return true; }
            }
            return false;
          })();
        `);
      };

      await wait(6000);

      // 1. Welcome screen
      await capture('01_welcome');

      // 2. Click "Start a Tutorial"
      await click('Start a Tutorial');
      await wait(1000);
      await capture('02_tutorial_select');

      // 3. Click Tutorial 1: Movement Basics
      await click('Tutorial 1: Movement Basics');
      await wait(1000);
      await capture('03_tutorial_step1');

      // 4. Click Next to advance through tutorial steps
      for (let i = 2; i <= 5; i++) {
        await click('Next');
        await wait(500);
      }
      await capture('04_tutorial_step5');

      // 5. Advance to the end
      for (let i = 6; i <= 9; i++) {
        await click('Next');
        await wait(500);
      }
      await capture('05_tutorial_final');

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
