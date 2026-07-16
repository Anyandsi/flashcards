import { randomUUID } from 'node:crypto';
import type { DeletionKind, DeletionReceipt } from '../../models/deletions';

const undoWindowMilliseconds = 15_000;

type PendingDeletion = {
  receipt: DeletionReceipt;
  restore: () => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pendingDeletions = new Map<string, PendingDeletion>();

export function createDeletionReceipt(
  kind: DeletionKind,
  label: string,
  restore: () => void,
): DeletionReceipt {
  const id = randomUUID();
  const receipt: DeletionReceipt = {
    expiresAt: new Date(Date.now() + undoWindowMilliseconds).toISOString(),
    id,
    kind,
    label,
  };
  const timeout = setTimeout(() => {
    pendingDeletions.delete(id);
  }, undoWindowMilliseconds);

  timeout.unref();
  pendingDeletions.set(id, { receipt, restore, timeout });

  return receipt;
}

export function undoDeletion(deletionId: string): DeletionReceipt {
  const pendingDeletion = pendingDeletions.get(deletionId);

  if (!pendingDeletion || Date.parse(pendingDeletion.receipt.expiresAt) < Date.now()) {
    pendingDeletions.delete(deletionId);
    throw new Error('Undo period has expired');
  }

  pendingDeletion.restore();
  clearTimeout(pendingDeletion.timeout);
  pendingDeletions.delete(deletionId);

  return pendingDeletion.receipt;
}
