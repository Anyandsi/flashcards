import { Search, Sword } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getReviewProgressPercentage,
  ReviewProgressBar,
} from '../../components/review/ReviewProgressBar';
import type { Deck } from '../../models/decks';
import type { SubjectReviewProgress } from '../../models/review';
import { reviewProgressChangeEvent } from '../review/reviewEvents';
import { routes } from '../routes';

const currentSubjectChangeEvent = 'current-subject-change';
const progressRefreshIntervalMilliseconds = 5 * 60 * 1000;

export function ReviewPage() {
  const [topics, setTopics] = useState<Deck[]>([]);
  const [currentSubjectId, setCurrentSubjectId] = useState<string | null>(null);
  const [reviewProgress, setReviewProgress] = useState<SubjectReviewProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const visibleTopics = useMemo(
    () => topics.filter((topic) => topic.subjectId === currentSubjectId),
    [currentSubjectId, topics],
  );
  const progressByTopicId = useMemo(
    () =>
      new Map(
        reviewProgress?.topicProgresses.map((topicProgress) => [
          topicProgress.topicId,
          topicProgress,
        ]) ?? [],
      ),
    [reviewProgress],
  );

  async function loadTopics() {
    const [storedTopics, storedCurrentSubjectId] = await Promise.all([
      window.api.decks.list(),
      window.api.subjects.getCurrent(),
    ]);
    const storedReviewProgress = storedCurrentSubjectId
      ? await window.api.review.getSubjectProgress(storedCurrentSubjectId)
      : null;

    setTopics(storedTopics);
    setCurrentSubjectId(storedCurrentSubjectId);
    setReviewProgress(storedReviewProgress);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialTopics() {
      try {
        const [storedTopics, storedCurrentSubjectId] = await Promise.all([
          window.api.decks.list(),
          window.api.subjects.getCurrent(),
        ]);
        const storedReviewProgress = storedCurrentSubjectId
          ? await window.api.review.getSubjectProgress(storedCurrentSubjectId)
          : null;

        if (isMounted) {
          setTopics(storedTopics);
          setCurrentSubjectId(storedCurrentSubjectId);
          setReviewProgress(storedReviewProgress);
        }
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

    loadInitialTopics();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    async function handleCurrentSubjectChange() {
      setErrorMessage(null);

      try {
        await loadTopics();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load topics');
      }
    }

    window.addEventListener(currentSubjectChangeEvent, handleCurrentSubjectChange);
    window.addEventListener(reviewProgressChangeEvent, handleCurrentSubjectChange);
    window.addEventListener('focus', handleCurrentSubjectChange);
    const intervalId = window.setInterval(
      handleCurrentSubjectChange,
      progressRefreshIntervalMilliseconds,
    );

    return () => {
      window.removeEventListener(currentSubjectChangeEvent, handleCurrentSubjectChange);
      window.removeEventListener(reviewProgressChangeEvent, handleCurrentSubjectChange);
      window.removeEventListener('focus', handleCurrentSubjectChange);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-primary">Review</p>
        <h1 className="mt-3 text-2xl font-semibold">Choose a topic</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Browse a topic or begin reviewing its cards.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-destructive bg-card p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading topics...
        </div>
      ) : null}

      {!isLoading && !currentSubjectId ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Choose or create a subject before reviewing cards.
        </div>
      ) : null}

      {!isLoading && currentSubjectId && !visibleTopics.length ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No topics are available for this subject yet.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleTopics.map((topic) => {
          const topicProgress = progressByTopicId.get(topic.id);
          const perfectCardCount = topicProgress?.perfectCardCount ?? 0;
          const totalCardCount = topicProgress?.totalCardCount ?? topic.cardCount;
          const progress = topicProgress?.progress ?? 0;
          const percentage = getReviewProgressPercentage(progress);

          return (
            <article
              className="flex min-h-40 flex-col justify-between gap-5 rounded-md border border-border bg-card p-5 text-card-foreground"
              key={topic.id}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{topic.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{topic.cardCount} cards</p>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {perfectCardCount} of {totalCardCount} perfect
                    </span>
                    <span>{percentage}%</span>
                  </div>
                  <ReviewProgressBar
                    label={`${topic.name} review progress`}
                    progress={progress}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Link
                  aria-label={`Browse ${topic.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
                  title={`Browse ${topic.name}`}
                  to={routes.topic(topic.id)}
                >
                  <Search aria-hidden="true" size={17} />
                </Link>
                <Link
                  aria-label={`Review ${topic.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90"
                  title={`Review ${topic.name}`}
                  to={routes.reviewTopic(topic.id)}
                >
                  <Sword aria-hidden="true" size={17} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
