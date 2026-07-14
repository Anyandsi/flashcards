export type MarkdownCardContents = {
  markdown: string;
  type: 'markdown';
};

export type CardContents = MarkdownCardContents;

export type Card = {
  contents: CardContents;
  id: string;
  title: string;
};

export type Deck = {
  cardIds: string[];
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
  cardIds?: string[];
  name: string;
  subjectId: string;
};

export type UpdateDeckInput = Partial<CreateDeckInput>;
