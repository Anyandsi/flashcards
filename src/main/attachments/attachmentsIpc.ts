import { ipcMain } from 'electron';
import type { SaveImageAttachmentInput } from '../../models/attachments';
import { trustedIpcHandler } from '../security/rendererSecurity';
import { saveImageAttachment } from './attachmentsRepository';

function parseImageData(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (ArrayBuffer.isView(value)) {
    const data = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const copy = new Uint8Array(data.byteLength);

    copy.set(data);

    return copy.buffer;
  }

  throw new Error('Image data is required');
}

function parseSaveImageInput(value: unknown): SaveImageAttachmentInput {
  if (
    !value ||
    typeof value !== 'object' ||
    !('data' in value) ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    !('type' in value) ||
    typeof value.type !== 'string'
  ) {
    throw new Error('Image input is invalid');
  }

  return {
    data: parseImageData(value.data),
    name: value.name,
    type: value.type,
  };
}

export function registerAttachmentHandlers() {
  ipcMain.handle(
    'attachments:save-image',
    trustedIpcHandler((_event, input: unknown) =>
      saveImageAttachment(parseSaveImageInput(input)),
    ),
  );
}
