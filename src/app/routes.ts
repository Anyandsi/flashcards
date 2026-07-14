export const routes = {
  addCard: (topicId: string) => `/library/${topicId}/add-card`,
  editCard: (topicId: string, cardId: string) => `/library/${topicId}/cards/${cardId}/edit`,
  legacyDecks: '/decks',
  library: '/library',
  overview: '/overview',
  review: '/review',
  root: '/',
  topic: (topicId: string) => `/library/${topicId}`,
} as const;

export const routePatterns = {
  addCard: '/library/:topicId/add-card',
  editCard: '/library/:topicId/cards/:cardId/edit',
  topic: '/library/:topicId',
} as const;
