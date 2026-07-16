import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardEditorForm } from '../../../components/cards/CardEditorForm';
import type { Card, CardContents, Deck } from '../../../models/decks';
import { announceReviewProgressChange } from '../../review/reviewEvents';
import { routes } from '../../routes';

type CardEditorValues = {
  contents: CardContents;
  title: string;
};

export function CardEditorPage() {
  const { cardId, topicId } = useParams<{ cardId?: string; topicId: string }>();
  const navigate = useNavigate();
  const isEditing = !!cardId;
  const [card, setCard] = useState<Card | null>(null);
  const [topic, setTopic] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEditorData() {
      if (!topicId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [storedTopic, storedCard] = await Promise.all([
          window.api.decks.get(topicId),
          cardId ? window.api.cards.get(cardId) : Promise.resolve(null),
        ]);

        if (storedCard && storedCard.deckId !== topicId) {
          throw new Error('Card does not belong to this topic');
        }

        if (isMounted) {
          setTopic(storedTopic);
          setCard(storedCard);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load editor');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEditorData();

    return () => {
      isMounted = false;
    };
  }, [cardId, topicId]);

  async function handleSubmit(values: CardEditorValues) {
    if (!topicId || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (cardId) {
        await window.api.cards.update(cardId, values);
      } else {
        await window.api.cards.createInDeck(topicId, values);
        announceReviewProgressChange();
      }

      navigate(routes.topic(topicId));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? 'Failed to update card'
            : 'Failed to add card',
      );
    } finally {
      setIsSaving(false);
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
          to={routes.topic(topicId)}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {topic?.name ?? 'Topic'}
        </Link>
        <p className="mt-5 text-sm font-medium text-accent">
          {isEditing ? 'Edit card' : 'New card'}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {isEditing ? card?.title ?? 'Card' : 'Add card'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Write markdown with LaTeX support.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-destructive bg-card p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading card...
        </div>
      ) : null}

      {!isLoading && (!isEditing || card) ? (
        <CardEditorForm
          initialContents={card?.contents}
          initialTitle={card?.title ?? ''}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          submitLabel={isEditing ? 'Save card' : 'Add card'}
        />
      ) : null}
    </section>
  );
}
