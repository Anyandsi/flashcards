import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { SaveImageAttachmentInput, SavedImageAttachment } from '../../models/attachments';

const attachmentProtocol = 'flashcards-attachment';
const maxImageSizeBytes = 10 * 1024 * 1024;
const imageExtensionsByMimeType = new Map([
  ['image/gif', '.gif'],
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const allowedImageExtensions = new Set(imageExtensionsByMimeType.values());

export function getAttachmentsDirectory() {
  return path.join(app.getPath('userData'), 'attachments');
}

export function getAttachmentFilePath(filename: string) {
  const safeFilename = path.basename(filename);

  if (!safeFilename) {
    throw new Error('Attachment filename is required');
  }

  return path.join(getAttachmentsDirectory(), safeFilename);
}

function getImageExtension(input: SaveImageAttachmentInput) {
  const extensionByType = imageExtensionsByMimeType.get(input.type.toLowerCase());

  if (extensionByType) {
    return extensionByType;
  }

  const extensionByName = path.extname(input.name).toLowerCase();

  if (allowedImageExtensions.has(extensionByName)) {
    return extensionByName;
  }

  throw new Error('Only PNG, JPG, GIF, and WebP images are supported');
}

export async function saveImageAttachment(
  input: SaveImageAttachmentInput,
): Promise<SavedImageAttachment> {
  if (!input.name.trim()) {
    throw new Error('Image name is required');
  }

  if (input.data.byteLength > maxImageSizeBytes) {
    throw new Error('Image must be smaller than 10 MB');
  }

  const extension = getImageExtension(input);
  const filename = `${randomUUID()}${extension}`;
  const filePath = getAttachmentFilePath(filename);

  await mkdir(getAttachmentsDirectory(), { recursive: true });
  await writeFile(filePath, Buffer.from(input.data));

  return {
    name: path.basename(input.name),
    src: `${attachmentProtocol}://attachments/${encodeURIComponent(filename)}`,
  };
}
