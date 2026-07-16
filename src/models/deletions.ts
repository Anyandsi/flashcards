export type DeletionKind = 'card' | 'subject' | 'topic';

export type DeletionReceipt = {
  expiresAt: string;
  id: string;
  kind: DeletionKind;
  label: string;
};
