export type TextCardContentBlock = {
  id: string;
  type: 'text';
  text: string;
};

export type ImageCardContentBlock = {
  alt?: string;
  id: string;
  src: string;
  type: 'image';
};

export type CardContentBlock = TextCardContentBlock | ImageCardContentBlock;

export type CardContents = {
  blocks: CardContentBlock[];
  type: 'document';
};

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
