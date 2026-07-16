import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReviewCard } from '../../components/cards/ReviewCard';
import { ReviewRatingControls } from '../../components/cards/ReviewRatingControls';
import type { Card, Deck } from '../../models/decks';
import { ReviewRating } from '../../models/review';
import { initializeReviewStack, updateReviewStack } from '../review/reviewStack';
import { routes } from '../routes';

const maximumVisibleCardsUnderTop = 5;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  );
}

export function ReviewTopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<Deck | null>(null);
  const [reviewStack, setReviewStack] = useState<Card[]>([]);
  const [initialCardCount, setInitialCardCount] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isUpdatingStack, setIsUpdatingStack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentCard = reviewStack[0] ?? null;
  const visibleCardsUnderTop = Math.min(
    Math.max(reviewStack.length - 1, 0),
    maximumVisibleCardsUnderTop,
  );
  const reviewedCardCount = initialCardCount - reviewStack.length;

  useEffect(() => {
    let isMounted = true;

    async function loadReview() {
      if (!topicId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [storedTopic, initializedStack] = await Promise.all([
          window.api.decks.get(topicId),
          initializeReviewStack(topicId),
        ]);

        if (isMounted) {
          setTopic(storedTopic);
          setReviewStack(initializedStack);
          setInitialCardCount(initializedStack.length);
          setIsAnswerRevealed(false);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load review');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReview();

    return () => {
      isMounted = false;
    };
  }, [topicId]);

  const handleRating = useCallback(
    async (rating: ReviewRating) => {
      if (!currentCard || isUpdatingStack) {
        return;
      }

      setIsUpdatingStack(true);
      setErrorMessage(null);

      try {
        const updatedStack = await updateReviewStack(reviewStack, rating);
        setReviewStack(updatedStack);
        setIsAnswerRevealed(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save review rating');
      } finally {
        setIsUpdatingStack(false);
      }
    },
    [currentCard, isUpdatingStack, reviewStack],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!currentCard || event.repeat || isInteractiveTarget(event.target)) {
        return;
      }

      if (event.key === 'Enter' && !isAnswerRevealed) {
        event.preventDefault();
        setIsAnswerRevealed(true);
        return;
      }

      if (!isAnswerRevealed) {
        return;
      }

      const ratingByKey: Partial<Record<string, ReviewRating>> = {
        '1': ReviewRating.Bad,
        '2': ReviewRating.Good,
        '3': ReviewRating.Perfect,
      };
      const rating = ratingByKey[event.key];

      if (rating) {
        event.preventDefault();
        void handleRating(rating);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentCard, handleRating, isAnswerRevealed]);

  if (!topicId) {
    return (
      <section className="rounded-md border border-border bg-card p-6 text-sm text-destructive">
        Topic id is missing.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            to={routes.review}
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Review topics
          </Link>
          <p className="mt-5 text-sm font-medium text-primary">Review</p>
          <h1 className="mt-3 text-2xl font-semibold">{topic?.name ?? 'Topic review'}</h1>
        </div>
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

      {!isLoading && currentCard ? (
        <div className="flex flex-col items-center gap-8 pb-4">
          <div className="relative w-full max-w-lg pb-14 pt-2">
            {Array.from({ length: visibleCardsUnderTop }, (_, index) => {
              const depth = visibleCardsUnderTop - index;

              return (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-14 top-2 rounded-lg bg-secondary shadow-md"
                  key={depth}
                  style={{
                    transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.01})`,
                    zIndex: 10 - depth,
                  }}
                />
              );
            })}

            <ReviewCard
              card={currentCard}
              isAnswerRevealed={isAnswerRevealed}
              onRevealAnswer={() => {
                setIsAnswerRevealed(true);
              }}
            />
          </div>

          <ReviewRatingControls
            disabled={!isAnswerRevealed || isUpdatingStack}
            onRate={(rating) => {
              void handleRating(rating);
            }}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && !currentCard ? (
        <div className="rounded-md border border-border bg-card p-8 text-center text-card-foreground">
          <h2 className="text-xl font-semibold">
            {initialCardCount ? 'Review complete' : 'No cards to review'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {initialCardCount
              ? `You reviewed all ${initialCardCount} cards in this topic.`
              : 'Add cards to this topic before starting a review.'}
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            to={routes.review}
          >
            Back to topics
          </Link>
        </div>
      ) : null}
    </section>
  );
}
