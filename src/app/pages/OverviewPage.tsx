import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SessionHistoryItem, Subject } from '../../models/subjects';

const sessionsPerPage = 6;

function getCurrentDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getCurrentTimeInputValue() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }

  if (!hours && !minutes) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function OverviewPage() {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualDate, setManualDate] = useState(getCurrentDateInputValue);
  const [manualTime, setManualTime] = useState(getCurrentTimeInputValue);
  const [manualDurationMinutes, setManualDurationMinutes] = useState('10');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(sessions.length / sessionsPerPage));
  const visibleSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * sessionsPerPage;

    return sessions.slice(startIndex, startIndex + sessionsPerPage);
  }, [currentPage, sessions]);

  useEffect(() => {
    let isMounted = true;

    async function loadOverviewData() {
      try {
        const [storedSessions, storedSubjects] = await Promise.all([
          window.api.subjects.listSessions(),
          window.api.subjects.list(),
        ]);

        if (isMounted) {
          setSessions(storedSessions);
          setSubjects(storedSubjects);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load sessions');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOverviewData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  async function handleDeleteSession(sessionId: string) {
    setErrorMessage(null);

    try {
      await window.api.subjects.deleteSession(sessionId);
      setSessions((currentSessions) =>
        currentSessions.filter((session) => session.id !== sessionId),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete session');
    }
  }

  async function handleCreateManualSession() {
    const currentSubjectId = await window.api.subjects.getCurrent();
    const durationMinutes = Number(manualDurationMinutes);

    if (!currentSubjectId) {
      setErrorMessage('Choose or create a subject before adding a session');
      return;
    }

    if (!manualDate || !manualTime || !Number.isFinite(durationMinutes) || durationMinutes < 10) {
      setErrorMessage('Manual sessions must include date, time, and at least 10 minutes');
      return;
    }

    const createdDate = new Date(`${manualDate}T${manualTime}`);

    if (Number.isNaN(createdDate.getTime())) {
      setErrorMessage('Session date or time is invalid');
      return;
    }

    setIsCreatingSession(true);
    setErrorMessage(null);

    try {
      await window.api.subjects.recordSession(
        currentSubjectId,
        durationMinutes * 60,
        createdDate.toISOString(),
      );
      setSessions(await window.api.subjects.listSessions());
      setSubjects(await window.api.subjects.list());
      setCurrentPage(1);
      setIsManualFormOpen(false);
      setManualDate(getCurrentDateInputValue());
      setManualTime(getCurrentTimeInputValue());
      setManualDurationMinutes('10');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add session');
    } finally {
      setIsCreatingSession(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Overview</p>
          <h1 className="mt-3 text-2xl font-semibold">Session history</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review recent study sessions across all subjects.
          </p>
        </div>

        <button
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          onClick={() => {
            setIsManualFormOpen((currentValue) => !currentValue);
          }}
          type="button"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      {isManualFormOpen ? (
        <div className="rounded-md border border-border bg-card p-5 text-card-foreground">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Date
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
                onChange={(event) => {
                  setManualDate(event.target.value);
                }}
                type="date"
                value={manualDate}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Time
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
                onChange={(event) => {
                  setManualTime(event.target.value);
                }}
                type="time"
                value={manualTime}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Duration (minutes)
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
                min="10"
                onChange={(event) => {
                  setManualDurationMinutes(event.target.value);
                }}
                step="1"
                type="number"
                value={manualDurationMinutes}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Session will be added to the currently selected subject.
            </p>
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isCreatingSession || !subjects.length}
              onClick={handleCreateManualSession}
              type="button"
            >
              {isCreatingSession ? 'Adding...' : 'Save session'}
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-destructive bg-card p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading sessions...
        </div>
      ) : null}

      {!isLoading && !sessions.length ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No study sessions yet.
        </div>
      ) : null}

      <div className="grid gap-3">
        {visibleSessions.map((session) => (
          <article
            className="rounded-md border border-border bg-card p-5 text-card-foreground"
            key={session.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{session.subjectName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatSessionDate(session.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                  {formatDuration(session.durationSeconds)}
                </span>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                  onClick={() => {
                    handleDeleteSession(session.id);
                  }}
                  type="button"
                  aria-label={`Delete ${session.subjectName} session`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {pageCount > 1 ? (
        <nav className="flex items-center gap-2" aria-label="Session history pages">
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
            <button
              className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm transition ${
                pageNumber === currentPage
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
              }`}
              key={pageNumber}
              onClick={() => {
                setCurrentPage(pageNumber);
              }}
              type="button"
            >
              {pageNumber}
            </button>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
