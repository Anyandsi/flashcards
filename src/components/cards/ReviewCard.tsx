import { Eye } from 'lucide-react';
import type { Card } from '../../models/decks';
import { MarkdownPreview } from './MarkdownPreview';

type ReviewCardProps = {
  card: Card;
  isAnswerRevealed: boolean;
  onRevealAnswer: () => void;
};

export function ReviewCard({ card, isAnswerRevealed, onRevealAnswer }: ReviewCardProps) {
  return (
    <article className="relative z-10 flex aspect-[4/5] min-h-96 flex-col rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
      <h2 className="shrink-0 border-b border-border pb-5 text-center text-2xl font-semibold leading-9">
        {card.title}
      </h2>

      <div className="flex min-h-0 flex-1 items-center justify-center py-6">
        {isAnswerRevealed ? (
          <div className="max-h-full w-full overflow-auto px-2">
            <MarkdownPreview markdown={card.contents.markdown} />
          </div>
        ) : (
          <button
            aria-keyshortcuts="Enter"
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#5796c7] px-5 text-sm font-semibold text-white transition hover:bg-[#6aaddd]"
            onClick={onRevealAnswer}
            type="button"
          >
            <Eye aria-hidden="true" size={17} />
            Reveal answer
          </button>
        )}
      </div>
    </article>
  );
}
