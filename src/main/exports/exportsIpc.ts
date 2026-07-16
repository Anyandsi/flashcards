import { BrowserWindow, dialog, ipcMain, type SaveDialogOptions } from 'electron';
import { writeFile } from 'node:fs/promises';
import type { SaveMarkdownExportInput } from '../../models/exports';
import { trustedIpcHandler } from '../security/rendererSecurity';

const maximumMarkdownBytes = 50 * 1024 * 1024;

function parseMarkdownExportInput(value: unknown): SaveMarkdownExportInput {
  if (
    !value ||
    typeof value !== 'object' ||
    !('contents' in value) ||
    typeof value.contents !== 'string' ||
    !('suggestedName' in value) ||
    typeof value.suggestedName !== 'string'
  ) {
    throw new Error('Markdown export is invalid');
  }

  if (Buffer.byteLength(value.contents, 'utf8') > maximumMarkdownBytes) {
    throw new Error('Markdown export is too large');
  }

  const printableName = Array.from(value.suggestedName, (character) =>
    character.charCodeAt(0) < 32 ? '-' : character,
  ).join('');
  const safeName = printableName
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\.md$/i, '')
    .replace(/\.+$/g, '')
    .slice(0, 120);

  return {
    contents: value.contents,
    suggestedName: `${safeName || 'topic'}.md`,
  };
}

export function registerExportHandlers() {
  ipcMain.handle(
    'exports:save-markdown',
    trustedIpcHandler(async (event, input: unknown) => {
      const exportInput = parseMarkdownExportInput(input);
      const ownerWindow = BrowserWindow.fromWebContents(event.sender);
      const options: SaveDialogOptions = {
        defaultPath: exportInput.suggestedName,
        filters: [{ extensions: ['md'], name: 'Markdown' }],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
        title: 'Export topic as Markdown',
      };
      const result = ownerWindow
        ? await dialog.showSaveDialog(ownerWindow, options)
        : await dialog.showSaveDialog(options);

      if (result.canceled || !result.filePath) {
        return false;
      }

      await writeFile(result.filePath, exportInput.contents, 'utf8');
      return true;
    }),
  );
}
