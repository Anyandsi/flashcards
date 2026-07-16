import {
  perfectRatingLifetimeMilliseconds,
  ReviewRating,
  type SubjectReviewProgress,
  type TopicReviewProgress,
} from '../../models/review';
import { getDatabase } from '../db/database';

type TopicReviewProgressRow = {
  perfect_card_count: number;
  topic_id: string;
  total_card_count: number;
};

function requireSubject(database: ReturnType<typeof getDatabase>, subjectId: string) {
  const subjectExists = database.prepare('SELECT 1 FROM subjects WHERE id = ?').get(subjectId);

  if (!subjectExists) {
    throw new Error('Subject does not exist');
  }
}

export function getSubjectReviewProgress(
  subjectId: string,
  currentTime = Date.now(),
  database = getDatabase(),
): SubjectReviewProgress {
  requireSubject(database, subjectId);

  const perfectCutoff = new Date(
    currentTime - perfectRatingLifetimeMilliseconds,
  ).toISOString();
  const rows = database
    .prepare(
      `
      SELECT
        decks.id AS topic_id,
        COUNT(cards.id) AS total_card_count,
        COALESCE(
          SUM(
            CASE
              WHEN cards.review_rating = @perfectRating
                AND (
                  cards.last_review_date IS NULL
                  OR cards.last_review_date > @perfectCutoff
                )
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS perfect_card_count
      FROM decks
      LEFT JOIN cards ON cards.deck_id = decks.id
      WHERE decks.subject_id = @subjectId
      GROUP BY decks.id
      ORDER BY decks.name COLLATE NOCASE ASC
      `,
    )
    .all({
      perfectCutoff,
      perfectRating: ReviewRating.Perfect,
      subjectId,
    }) as TopicReviewProgressRow[];
  const topicProgresses: TopicReviewProgress[] = rows.map((row) => ({
    perfectCardCount: row.perfect_card_count,
    progress: row.total_card_count ? row.perfect_card_count / row.total_card_count : 0,
    topicId: row.topic_id,
    totalCardCount: row.total_card_count,
  }));
  const progress = topicProgresses.length
    ? topicProgresses.reduce((total, topic) => total + topic.progress, 0) /
      topicProgresses.length
    : 0;

  return {
    progress,
    topicProgresses,
  };
}
