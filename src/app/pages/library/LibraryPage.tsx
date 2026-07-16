import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Deck } from '../../../models/decks';
import type { Subject } from '../../../models/subjects';
import { routes } from '../../routes';

const currentSubjectChangeEvent = 'current-subject-change';

function getSubjectName(subjects: Subject[], subjectId: string | null) {
  return subjects.find((subject) => subject.id === subjectId)?.name ?? 'current subject';
}

export function LibraryPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckName, setEditingDeckName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentSubjectName = getSubjectName(subjects, currentSubjectId);
  const visibleDecks = useMemo(
    () => decks.filter((deck) => deck.subjectId === currentSubjectId),
    [currentSubjectId, decks],
  );

  async function loadDeckData() {
    const [storedDecks, storedSubjects, storedCurrentSubjectId] = await Promise.all([
      window.api.decks.list(),
      window.api.subjects.list(),
      window.api.subjects.getCurrent(),
    ]);

    setDecks(storedDecks);
    setSubjects(storedSubjects);
    setCurrentSubjectId(storedCurrentSubjectId);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [storedDecks, storedSubjects, storedCurrentSubjectId] = await Promise.all([
          window.api.decks.list(),
          window.api.subjects.list(),
          window.api.subjects.getCurrent(),
        ]);

        if (!isMounted) {
          return;
        }

        setDecks(storedDecks);
        setSubjects(storedSubjects);
        setCurrentSubjectId(storedCurrentSubjectId);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load topics');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    async function handleCurrentSubjectChange() {
      try {
        await loadDeckData();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load topics');
      }
    }

    window.addEventListener(currentSubjectChangeEvent, handleCurrentSubjectChange);

    return () => {
      window.removeEventListener(currentSubjectChangeEvent, handleCurrentSubjectChange);
    };
  }, []);

  async function handleCreateDeck() {
    const deckName = newDeckName.trim();

    if (!deckName || !currentSubjectId || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const deck = await window.api.decks.create({
        name: deckName,
        subjectId: currentSubjectId,
      });

      setDecks((currentDecks) => [...currentDecks, deck]);
      setNewDeckName('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create topic');
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartEditing(deck: Deck) {
    setEditingDeckId(deck.id);
    setEditingDeckName(deck.name);
    setErrorMessage(null);
  }

  function handleCancelEditing() {
    setEditingDeckId(null);
    setEditingDeckName('');
  }

  async function handleRenameDeck(deck: Deck) {
    const deckName = editingDeckName.trim();

    if (!deckName || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedDeck = await window.api.decks.update(deck.id, {
        name: deckName,
      });

      setDecks((currentDecks) =>
        currentDecks.map((currentDeck) =>
          currentDeck.id === updatedDeck.id ? updatedDeck : currentDeck,
        ),
      );
      handleCancelEditing();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to rename topic');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDeck(deckId: string) {
    setErrorMessage(null);

    try {
      await window.api.decks.delete(deckId);
      setDecks((currentDecks) => currentDecks.filter((deck) => deck.id !== deckId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete topic');
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">Library</p>
          <h1 className="mt-3 text-2xl font-semibold">Topic library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create and organize topics for {currentSubjectName}.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-5 text-card-foreground">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            disabled={!currentSubjectId || isSaving}
            onChange={(event) => {
              setNewDeckName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleCreateDeck();
              }
            }}
            placeholder={currentSubjectId ? 'New topic name' : 'Create a subject first'}
            type="text"
            value={newDeckName}
          />
          <button
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!newDeckName.trim() || !currentSubjectId || isSaving}
            onClick={handleCreateDeck}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Create topic'}
          </button>
        </div>

        {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}
      </div>

      {isLoading ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading topics...
        </div>
      ) : null}

      {!isLoading && !currentSubjectId ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Choose or create a subject before adding topics.
        </div>
      ) : null}

      {!isLoading && currentSubjectId && !visibleDecks.length ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No topics for this subject yet.
        </div>
      ) : null}

      <div className="grid gap-3">
        {visibleDecks.map((deck) => {
          const isEditing = deck.id === editingDeckId;

          return (
            <article
              className="rounded-md border border-border bg-card p-5 text-card-foreground"
              key={deck.id}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                      onChange={(event) => {
                        setEditingDeckName(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleRenameDeck(deck);
                        }

                        if (event.key === 'Escape') {
                          handleCancelEditing();
                        }
                      }}
                      type="text"
                      value={editingDeckName}
                    />
                  ) : (
                    <>
                      <Link
                        className="block rounded-md outline-none transition hover:text-primary focus:text-primary"
                        to={routes.topic(deck.id)}
                      >
                        <h2 className="truncate text-base font-semibold">{deck.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {deck.cardCount} cards
                        </p>
                      </Link>
                    </>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        aria-label={`Save ${deck.name} name`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-success disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!editingDeckName.trim() || isSaving}
                        onClick={() => {
                          handleRenameDeck(deck);
                        }}
                        type="button"
                      >
                        <Check size={16} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Cancel editing ${deck.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
                        onClick={handleCancelEditing}
                        type="button"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        aria-label={`Rename ${deck.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
                        onClick={() => {
                          handleStartEditing(deck);
                        }}
                        type="button"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Delete ${deck.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                        onClick={() => {
                          handleDeleteDeck(deck.id);
                        }}
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
