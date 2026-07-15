import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function getRendererEntryUrl() {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    return new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  }

  return new URL(
    pathToFileURL(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    ).toString(),
  );
}

function isTrustedRendererUrl(value: string) {
  try {
    const candidateUrl = new URL(value);
    const rendererUrl = getRendererEntryUrl();

    if (rendererUrl.protocol === 'file:') {
      return (
        candidateUrl.protocol === 'file:' &&
        path.resolve(fileURLToPath(candidateUrl)) === path.resolve(fileURLToPath(rendererUrl))
      );
    }

    return candidateUrl.origin === rendererUrl.origin;
  } catch {
    return false;
  }
}

function getSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function openExternalUrl(value: string) {
  const safeUrl = getSafeExternalUrl(value);

  if (!safeUrl) {
    return;
  }

  void shell.openExternal(safeUrl).catch((error: unknown) => {
    console.error('Failed to open external URL', error);
  });
}

export function assertTrustedIpcSender(event: IpcMainInvokeEvent) {
  const senderFrame = event.senderFrame;

  if (
    !senderFrame ||
    senderFrame !== event.sender.mainFrame ||
    !isTrustedRendererUrl(senderFrame.url)
  ) {
    throw new Error('Unauthorized IPC sender');
  }
}

export function trustedIpcHandler<Arguments extends unknown[], Result>(
  handler: (event: IpcMainInvokeEvent, ...args: Arguments) => Result,
) {
  return (event: IpcMainInvokeEvent, ...args: Arguments) => {
    assertTrustedIpcSender(event);

    return handler(event, ...args);
  };
}

export function configureRendererSecurity(window: BrowserWindow) {
  const { webContents } = window;
  const { session } = webContents;

  session.setPermissionCheckHandler(() => false);
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  webContents.on('will-navigate', (details) => {
    details.preventDefault();
    openExternalUrl(details.url);
  });

  webContents.on('will-frame-navigate', (details) => {
    if (!details.isMainFrame) {
      details.preventDefault();
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);

    return { action: 'deny' };
  });
}
