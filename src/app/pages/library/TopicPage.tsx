import { ArrowLeft, LayoutGrid, NotebookText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type { Card, Deck } from '../../../models/decks';
import { useDeletionFeedback } from '../../../components/feedback/DeletionFeedback';
import { MarkdownPreview } from '../../../components/cards/MarkdownPreview';
import { announceReviewProgressChange } from '../../review/reviewEvents';
import { routes } from '../../routes';

type TopicViewMode = 'cards' | 'notes';

export function TopicPage() {
  const { confirmDeletion, showUndo } = useDeletionFeedback();
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [viewMode, setViewMode] = useState<TopicViewMode>('cards');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const combinedMarkdown = useMemo(
    () =>
      cards
        .map((card) => `## ${card.title}\n\n${card.contents.markdown}`)
        .join('\n\n---\n\n'),
    [cards],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadTopic() {
      if (!topicId) {
        setIsLoading(false);
        return;
      }

      try {
        const [storedTopic, storedCards] = await Promise.all([
          window.api.decks.get(topicId),
          window.api.cards.listByDeck(topicId),
        ]);

        if (!isMounted) {
          return;
        }

        setTopic(storedTopic);
        setCards(storedCards);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load topic');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTopic();

    return () => {
      isMounted = false;
    };
  }, [topicId]);

  async function reloadTopic() {
    if (!topicId) {
      return;
    }

    const [storedTopic, storedCards] = await Promise.all([
      window.api.decks.get(topicId),
      window.api.cards.listByDeck(topicId),
    ]);
    setTopic(storedTopic);
    setCards(storedCards);
  }

  async function handleDeleteCard(card: Card) {
    if (!topic) {
      return;
    }

    const confirmed = await confirmDeletion({
      description: 'This card and its review history will be deleted. You can undo this for a short time.',
      title: `Delete “${card.title}”?`,
    });

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);

    try {
      const receipt = await window.api.cards.delete(card.id);
      setCards((currentCards) => currentCards.filter((currentCard) => currentCard.id !== card.id));
      setTopic({
        ...topic,
        cardCount: Math.max(topic.cardCount - 1, 0),
      });
      announceReviewProgressChange();
      showUndo({
        message: `Deleted card “${card.title}”`,
        onUndone: async () => {
          await reloadTopic();
          announceReviewProgressChange();
        },
        receipt,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete card');
    }
  }

  if (!topicId) {
    return (
      <section className="rounded-md border border-border bg-card p-6 text-sm text-destructive">
        Topic id is missing.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          to={routes.library}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Library
        </Link>
        <p className="mt-5 text-sm font-medium text-accent">Topic</p>
        <h1 className="mt-3 text-2xl font-semibold">{topic?.name ?? 'Topic cards'}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            aria-label="Topic view"
            className="flex rounded-md border border-border bg-card p-1"
            role="group"
          >
            <button
              aria-pressed={viewMode === 'cards'}
              className={`flex h-8 items-center gap-2 rounded px-3 text-sm font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setViewMode('cards');
              }}
              type="button"
            >
              <LayoutGrid aria-hidden="true" size={15} />
              Cards
            </button>
            <button
              aria-pressed={viewMode === 'notes'}
              className={`flex h-8 items-center gap-2 rounded px-3 text-sm font-medium transition ${
                viewMode === 'notes'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setViewMode('notes');
              }}
              type="button"
            >
              <NotebookText aria-hidden="true" size={15} />
              Notes
            </button>
          </div>

          <Link
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            to={routes.addCard(topicId)}
          >
            <Plus size={16} aria-hidden="true" />
            Add card
          </Link>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {viewMode === 'cards'
            ? 'Add, edit, and delete cards in this topic.'
            : 'Read every card in this topic as one combined note.'}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-destructive bg-card p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading cards...
        </div>
      ) : null}

      {!isLoading && !cards.length ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No cards in this topic yet.
        </div>
      ) : null}

      {viewMode === 'cards' ? (
        <div className="grid gap-3">
          {cards.map((card) => (
            <article
              className="rounded-md border border-border bg-card p-5 text-card-foreground"
              key={card.id}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    className="block rounded-md outline-none transition hover:text-primary focus:text-primary"
                    to={routes.editCard(topicId, card.id)}
                  >
                    <h2 className="truncate text-base font-semibold">{card.title}</h2>
                  </Link>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    aria-label={`Edit ${card.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
                    to={routes.editCard(topicId, card.id)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </Link>
                  <button
                    aria-label={`Delete ${card.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                    onClick={() => {
                      handleDeleteCard(card);
                    }}
                    type="button"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-border bg-background p-4">
                <MarkdownPreview markdown={card.contents.markdown} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {viewMode === 'notes' && cards.length ? (
        <article className="rounded-md border border-border bg-card p-6 text-card-foreground">
          <MarkdownPreview markdown={combinedMarkdown} />
        </article>
      ) : null}
    </section>
  );
}
