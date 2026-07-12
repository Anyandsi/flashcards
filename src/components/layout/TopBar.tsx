import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { SubjectSwitcher } from './SubjectSwitcher';

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
  const elapsedTime = formatElapsedTime(elapsedSeconds);

  useEffect(() => {
    // manages timer lifecycle: measure and display timestamp while active, reset 0 once done
    // TODO: manage storing spent time in a database
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setIsActive((currentValue) => !currentValue);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
          onClick={() => {
            setIsActive((v) => !v);
          }}
          type="button"
        >
          {isActive ? 'Stop grinding' : 'Start grinding'}
        </button>
      </div>
    </header>
  );
}
