import { net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getAttachmentFilePath } from './attachmentsRepository';

export function registerAttachmentProtocol() {
  protocol.handle('flashcards-attachment', (request) => {
    const url = new URL(request.url);
    const filename = path.basename(decodeURIComponent(url.pathname));
    const fileUrl = pathToFileURL(getAttachmentFilePath(filename)).toString();

    return net.fetch(fileUrl);
  });
}
