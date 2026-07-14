export type SaveImageAttachmentInput = {
  data: ArrayBuffer;
  name: string;
  type: string;
};

export type SavedImageAttachment = {
  name: string;
  src: string;
};
