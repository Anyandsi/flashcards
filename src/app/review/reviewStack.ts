import type { Card } from '../../models/decks';
import { getEffectiveReviewRating, ReviewRating } from '../../models/review';
import { announceReviewProgressChange } from './reviewEvents';

// Stack data structure with current to-be-reviewed cards constructed for a chosen topic.
export async function initializeReviewStack(topicId: string): Promise<Card[]> {
  const cards = await window.api.cards.listByDeck(topicId);
  const cardsWithEffectiveRatings = cards.map((card) => ({
    ...card,
    reviewRating: getEffectiveReviewRating(card),
  }));
  const cardsWithoutPerfect = cardsWithEffectiveRatings.filter(
    (card) => card.reviewRating !== ReviewRating.Perfect,
  );

  // if all the cards in the deck are perfect we are doing a review of all of them
  // otherwise, proceed with "imperfect" cards
  if (cardsWithoutPerfect.length === 0) {
    return cardsWithEffectiveRatings;
  }

  return cardsWithoutPerfect;
}

export async function updateReviewStack(stack: Card[], rating: ReviewRating): Promise<Card[]> {
  const currentCard = stack[0];

  if (!currentCard) {
    return stack;
  }

  await window.api.cards.setReviewRating(currentCard.id, rating);
  announceReviewProgressChange();

  return stack.slice(1);
}
