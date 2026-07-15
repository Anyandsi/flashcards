import { net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getAttachmentFilePath } from './attachmentsRepository';

const attachmentPathPattern =
  /^\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(gif|jpg|png|webp)$/i;

function notFoundResponse() {
  return new Response(null, { status: 404 });
}

export function registerAttachmentProtocol() {
  protocol.handle('flashcards-attachment', (request) => {
    try {
      const url = new URL(request.url);
      const decodedPath = decodeURIComponent(url.pathname);

      if (
        request.method !== 'GET' ||
        url.hostname !== 'attachments' ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash ||
        !attachmentPathPattern.test(decodedPath)
      ) {
        return notFoundResponse();
      }

      const filename = path.basename(decodedPath);
      const fileUrl = pathToFileURL(getAttachmentFilePath(filename)).toString();

      return net.fetch(fileUrl);
    } catch {
      return notFoundResponse();
    }
  });
}
