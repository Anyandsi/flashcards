import {
  ArrowLeft,
  FileDown,
  GripVertical,
  LayoutGrid,
  NotebookText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { type DragEvent, useEffect, useMemo, useState } from 'react';
import type { Card, Deck } from '../../../models/decks';
import { useDeletionFeedback } from '../../../components/feedback/DeletionFeedback';
import { MarkdownPreview } from '../../../components/cards/MarkdownPreview';
import { announceReviewProgressChange } from '../../review/reviewEvents';
import { routes } from '../../routes';

type TopicViewMode = 'cards' | 'notes';
type CardDropTarget = {
  cardId: string;
  placement: 'after' | 'before';
};

function moveCard(
  cards: Card[],
  draggedCardId: string,
  targetCardId: string,
  placement: CardDropTarget['placement'],
) {
  const draggedCard = cards.find((card) => card.id === draggedCardId);

  if (!draggedCard || draggedCardId === targetCardId) {
    return cards;
  }

  const cardsWithoutDraggedCard = cards.filter((card) => card.id !== draggedCardId);
  const targetIndex = cardsWithoutDraggedCard.findIndex((card) => card.id === targetCardId);

  if (targetIndex === -1) {
    return cards;
  }

  const insertionIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
  const reorderedCards = [...cardsWithoutDraggedCard];

  reorderedCards.splice(insertionIndex, 0, draggedCard);

  return reorderedCards;
}

function cardOrderMatches(firstCards: Card[], secondCards: Card[]) {
  return (
    firstCards.length === secondCards.length &&
    firstCards.every((card, index) => card.id === secondCards[index]?.id)
  );
}

export function TopicPage() {
  const { confirmDeletion, showUndo } = useDeletionFeedback();
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [viewMode, setViewMode] = useState<TopicViewMode>('cards');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CardDropTarget | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
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

  function handleCardDragStart(event: DragEvent<HTMLElement>, cardId: string) {
    if (isReordering) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
    setDropTarget(null);
  }

  function handleCardDragOver(event: DragEvent<HTMLElement>, targetCardId: string) {
    if (!draggedCardId || draggedCardId === targetCardId || isReordering) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';

    setDropTarget((currentTarget) =>
      currentTarget?.cardId === targetCardId && currentTarget.placement === placement
        ? currentTarget
        : { cardId: targetCardId, placement },
    );
  }

  async function handleCardDrop(event: DragEvent<HTMLElement>, targetCardId: string) {
    event.preventDefault();

    if (!draggedCardId || draggedCardId === targetCardId || isReordering) {
      setDraggedCardId(null);
      setDropTarget(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    const previousCards = cards;
    const reorderedCards = moveCard(cards, draggedCardId, targetCardId, placement);

    setDraggedCardId(null);
    setDropTarget(null);

    if (cardOrderMatches(previousCards, reorderedCards)) {
      return;
    }

    setCards(reorderedCards);
    setIsReordering(true);
    setErrorMessage(null);

    try {
      const savedCards = await window.api.cards.reorder(
        topicId,
        reorderedCards.map((card) => card.id),
      );
      setCards(savedCards);
    } catch (error) {
      setCards(previousCards);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save card order');
    } finally {
      setIsReordering(false);
    }
  }

  // TODO: add support for image export
  async function handleExportMarkdown() {
    if (!topic || !cards.length || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportMessage(null);
    setErrorMessage(null);

    try {
      const wasSaved = await window.api.exports.saveMarkdown({
        contents: combinedMarkdown,
        suggestedName: topic.name,
      });

      if (wasSaved) {
        setExportMessage('Markdown file saved');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export Markdown');
    } finally {
      setIsExporting(false);
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

          <button
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-card-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!topic || !cards.length || isExporting}
            onClick={handleExportMarkdown}
            type="button"
          >
            <FileDown size={16} aria-hidden="true" />
            {isExporting ? 'Exporting...' : 'Export .md'}
          </button>

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
            ? 'Add, edit, delete, or drag cards into the order you want.'
            : 'Read every card in this topic as one combined note.'}
        </p>
        {exportMessage ? <p className="mt-2 text-sm text-success">{exportMessage}</p> : null}
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
              className={`relative rounded-md border border-border bg-card p-5 text-card-foreground transition-opacity ${
                draggedCardId === card.id ? 'opacity-50' : ''
              }`}
              key={card.id}
              onDragOver={(event) => {
                handleCardDragOver(event, card.id);
              }}
              onDrop={(event) => {
                handleCardDrop(event, card.id);
              }}
            >
              {dropTarget?.cardId === card.id ? (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-2 right-2 h-0.5 rounded-full bg-primary ${
                    dropTarget.placement === 'before' ? '-top-2' : '-bottom-2'
                  }`}
                />
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    aria-label={`Drag ${card.title} to reorder`}
                    className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isReordering}
                    draggable={!isReordering}
                    onDragEnd={() => {
                      setDraggedCardId(null);
                      setDropTarget(null);
                    }}
                    onDragStart={(event) => {
                      handleCardDragStart(event, card.id);
                    }}
                    title="Drag to reorder"
                    type="button"
                  >
                    <GripVertical size={17} aria-hidden="true" />
                  </button>
                  <Link
                    className="min-w-0 flex-1 rounded-md outline-none transition hover:text-primary focus:text-primary"
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
