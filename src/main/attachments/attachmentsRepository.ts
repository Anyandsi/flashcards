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

function hasBytes(data: Uint8Array, offset: number, expected: number[]) {
  return expected.every((byte, index) => data[offset + index] === byte);
}

function hasAscii(data: Uint8Array, offset: number, expected: string) {
  return Array.from(expected).every(
    (character, index) => data[offset + index] === character.charCodeAt(0),
  );
}

function isValidImageData(data: ArrayBuffer, extension: string) {
  const bytes = new Uint8Array(data);

  switch (extension) {
    case '.gif':
      return hasAscii(bytes, 0, 'GIF87a') || hasAscii(bytes, 0, 'GIF89a');
    case '.jpg':
      return hasBytes(bytes, 0, [0xff, 0xd8, 0xff]);
    case '.png':
      return hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case '.webp':
      return hasAscii(bytes, 0, 'RIFF') && hasAscii(bytes, 8, 'WEBP');
    default:
      return false;
  }
}

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

  if (!isValidImageData(input.data, extension)) {
    throw new Error('Image contents do not match the selected file type');
  }

  const filename = `${randomUUID()}${extension}`;
  const filePath = getAttachmentFilePath(filename);

  await mkdir(getAttachmentsDirectory(), { recursive: true });
  await writeFile(filePath, Buffer.from(input.data));

  return {
    name: path.basename(input.name),
    src: `${attachmentProtocol}://attachments/${encodeURIComponent(filename)}`,
  };
}
