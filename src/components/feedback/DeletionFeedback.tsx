import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { DeletionReceipt } from '../../models/deletions';

type ConfirmationOptions = {
  confirmLabel?: string;
  description: string;
  title: string;
};

type UndoOptions = {
  message: string;
  onUndone?: () => Promise<void> | void;
  receipt: DeletionReceipt;
};

type ConfirmationState = ConfirmationOptions & {
  resolve: (confirmed: boolean) => void;
};

type UndoNotice = UndoOptions & {
  errorMessage: string | null;
  isUndoing: boolean;
};

type DeletionFeedbackValue = {
  confirmDeletion: (options: ConfirmationOptions) => Promise<boolean>;
  showUndo: (options: UndoOptions) => void;
};

const DeletionFeedbackContext = createContext<DeletionFeedbackValue | null>(null);

export function DeletionFeedbackProvider({ children }: { children: ReactNode }) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [undoNotices, setUndoNotices] = useState<UndoNotice[]>([]);

  const closeConfirmation = useCallback((confirmed: boolean) => {
    setConfirmation((currentConfirmation) => {
      currentConfirmation?.resolve(confirmed);
      return null;
    });
  }, []);

  const confirmDeletion = useCallback(
    (options: ConfirmationOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmation((currentConfirmation) => {
          currentConfirmation?.resolve(false);
          return { ...options, resolve };
        });
      }),
    [],
  );

  const showUndo = useCallback((options: UndoOptions) => {
    setUndoNotices((currentNotices) => [
      ...currentNotices,
      { ...options, errorMessage: null, isUndoing: false },
    ]);
  }, []);

  const dismissUndo = useCallback((deletionId: string) => {
    setUndoNotices((currentNotices) =>
      currentNotices.filter((notice) => notice.receipt.id !== deletionId),
    );
  }, []);

  useEffect(() => {
    if (!confirmation) {
      return undefined;
    }

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeConfirmation(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeConfirmation, confirmation]);

  useEffect(() => {
    const timeouts = undoNotices.map((notice) =>
      window.setTimeout(
        () => {
          dismissUndo(notice.receipt.id);
        },
        Math.max(Date.parse(notice.receipt.expiresAt) - Date.now(), 0),
      ),
    );

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [dismissUndo, undoNotices]);

  async function handleUndo(notice: UndoNotice) {
    setUndoNotices((currentNotices) =>
      currentNotices.map((currentNotice) =>
        currentNotice.receipt.id === notice.receipt.id
          ? { ...currentNotice, errorMessage: null, isUndoing: true }
          : currentNotice,
      ),
    );

    try {
      await window.api.deletions.undo(notice.receipt.id);
      dismissUndo(notice.receipt.id);
      await notice.onUndone?.();
    } catch (error) {
      setUndoNotices((currentNotices) =>
        currentNotices.map((currentNotice) =>
          currentNotice.receipt.id === notice.receipt.id
            ? {
                ...currentNotice,
                errorMessage: error instanceof Error ? error.message : 'Failed to undo deletion',
                isUndoing: false,
              }
            : currentNotice,
        ),
      );
    }
  }

  return (
    <DeletionFeedbackContext.Provider value={{ confirmDeletion, showUndo }}>
      {children}

      {confirmation ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirmation(false);
            }
          }}
          role="alertdialog"
        >
          <div className="w-full max-w-sm rounded-md border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertTriangle aria-hidden="true" size={18} />
              </span>
              <div>
                <h2 className="text-base font-semibold">{confirmation.title}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {confirmation.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-9 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  closeConfirmation(false);
                }}
                ref={cancelButtonRef}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-9 rounded-md bg-destructive px-3 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
                onClick={() => {
                  closeConfirmation(true);
                }}
                type="button"
              >
                {confirmation.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2"
      >
        {undoNotices.map((notice) => (
          <div
            className="pointer-events-auto rounded-md border border-border bg-card p-3 text-card-foreground shadow-2xl"
            key={notice.receipt.id}
          >
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{notice.message}</p>
              <button
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={notice.isUndoing}
                onClick={() => {
                  handleUndo(notice);
                }}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={15} />
                {notice.isUndoing ? 'Restoring...' : 'Undo'}
              </button>
              <button
                aria-label="Dismiss undo notification"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  dismissUndo(notice.receipt.id);
                }}
                type="button"
              >
                <X aria-hidden="true" size={15} />
              </button>
            </div>
            {notice.errorMessage ? (
              <p className="mt-2 text-xs text-destructive">{notice.errorMessage}</p>
            ) : null}
          </div>
        ))}
      </div>
    </DeletionFeedbackContext.Provider>
  );
}

export function useDeletionFeedback() {
  const value = useContext(DeletionFeedbackContext);

  if (!value) {
    throw new Error('useDeletionFeedback must be used inside DeletionFeedbackProvider');
  }

  return value;
}
