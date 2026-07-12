import { ChevronDown, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Subject } from '../../models/subjects';

function findInitialSubjectId(subjects: Subject[], currentSubjectId: string | null) {
  if (!subjects.length) {
    return null;
  }

  const currentSubject = subjects.find((subject) => subject.id === currentSubjectId);

  return currentSubject?.id ?? subjects[0].id;
}

export function SubjectSwitcher() {
  const switcherRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0] ?? null;
  const subjectNameInput = searchValue.trim();
  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subject) =>
        subject.name.toLowerCase().includes(subjectNameInput.toLowerCase()),
      ),
    [subjectNameInput, subjects],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSubjects() {
      try {
        const [storedSubjects, currentSubjectId] = await Promise.all([
          window.api.subjects.list(),
          window.api.subjects.getCurrent(),
        ]);

        if (!isMounted) {
          return;
        }

        const initialSubjectId = findInitialSubjectId(storedSubjects, currentSubjectId);
        setSubjects(storedSubjects);
        setSelectedSubjectId(initialSubjectId);

        if (initialSubjectId && initialSubjectId !== currentSubjectId) {
          await window.api.subjects.setCurrent(initialSubjectId);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load subjects');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        switcherRef.current &&
        !switcherRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  async function handleSelectSubject(subjectId: string) {
    setSelectedSubjectId(subjectId);
    setIsOpen(false);
    setErrorMessage(null);

    try {
      // set current persistent subject that will also be saved between sessions
      await window.api.subjects.setCurrent(subjectId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to select subject');
    }
  }

  async function handleCreateSubject() {
    if (!subjectNameInput || isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const subject = await window.api.subjects.create({ name: subjectNameInput });
      setSubjects((currentSubjects) => [...currentSubjects, subject]);
      setSelectedSubjectId(subject.id);
      setSearchValue('');
      setIsOpen(false);
      await window.api.subjects.setCurrent(subject.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create subject');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="relative" ref={switcherRef}>
      <button
        className="flex h-10 min-w-64 items-center justify-between gap-4 rounded-md border border-border bg-card px-3 text-left text-card-foreground transition hover:bg-secondary"
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
        }}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {selectedSubject?.name ?? (isLoading ? 'Loading subjects' : 'No subject selected')}
          </span>
          <span className="block text-xs text-muted-foreground">
            {subjects.length ? 'Current subject' : 'Add a subject to start'}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-muted-foreground transition ${isOpen ? 'rotate-180' : ''}`}
          size={17}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-12 z-10 w-80 rounded-md border border-border bg-card p-2 text-card-foreground shadow-2xl">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
            <Search size={15} aria-hidden="true" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => {
                setSearchValue(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleCreateSubject();
                }
              }}
              placeholder={subjects.length ? 'Search or add subject' : 'Name your first subject'}
              type="text"
              value={searchValue}
            />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto">
            {filteredSubjects.map((subject) => {
              const isSelected = subject.id === selectedSubjectId;

              return (
                <button
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                  key={subject.id}
                  onClick={() => {
                    handleSelectSubject(subject.id);
                  }}
                  type="button"
                >
                  <span className="text-sm font-medium">{subject.name}</span>
                  <span className="text-xs opacity-80">Subject</span>
                </button>
              );
            })}

            {!filteredSubjects.length ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {subjects.length ? 'No subjects match your search.' : 'No subjects yet.'}
              </p>
            ) : null}
          </div>

          {errorMessage ? <p className="mt-2 px-2 text-xs text-destructive">{errorMessage}</p> : null}

          <button
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!subjectNameInput || isCreating}
            onClick={handleCreateSubject}
            type="button"
          >
            <Plus size={15} aria-hidden="true" />
            {isCreating ? 'Adding...' : subjectNameInput ? `Add "${subjectNameInput}"` : 'Add subject'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
