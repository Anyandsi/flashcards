import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { SubjectSwitcher } from './SubjectSwitcher';

const minimumSessionSeconds = 10 * 60;

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  );
}

export function TopBar() {
  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const elapsedTime = formatElapsedTime(elapsedSeconds);

  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActive]);

  async function handleToggleGrinding() {
    if (!isActive) {
      setActiveSubjectId(await window.api.subjects.getCurrent());
      setElapsedSeconds(0);
      setIsActive(true);
      return;
    }

    const secondsToSave = elapsedSeconds;
    const subjectId = activeSubjectId;

    setIsActive(false);
    setActiveSubjectId(null);

    if (subjectId && secondsToSave >= minimumSessionSeconds) {
      await window.api.subjects.recordSession(subjectId, secondsToSave);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      handleToggleGrinding();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSubjectId, elapsedSeconds, isActive]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <SubjectSwitcher />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer size={17} aria-hidden="true" />
          <time dateTime={`PT${elapsedSeconds}S`}>{elapsedTime}</time>
        </div>

        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          onClick={handleToggleGrinding}
          type="button"
        >
          {isActive ? 'Stop grinding' : 'Start grinding'}
        </button>
      </div>
    </header>
  );
}
