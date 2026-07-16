export type MarkdownCardContents = {
  markdown: string;
  type: 'markdown';
};

export type CardContents = MarkdownCardContents;

export type Card = {
  contents: CardContents;
  deckId: string;
  id: string;
  title: string;
};

export type Deck = {
  cardCount: number;
  id: string;
  name: string;
  subjectId: string;
};

export type CreateCardInput = {
  contents?: CardContents;
  title: string;
};

export type UpdateCardInput = Partial<CreateCardInput>;

export type CreateDeckInput = {
  name: string;
  subjectId: string;
};

export type UpdateDeckInput = Partial<CreateDeckInput>;
