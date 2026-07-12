export type Session = {
  id: string;
  createdAt: string;
  durationSeconds: number;
};

export type SessionHistoryItem = Session & {
  subjectId: string;
  subjectName: string;
};

export type Subject = {
  id: string;
  name: string;
  timeSpent: number;
  sessions: Session[];
};

export type CreateSubjectInput = {
  name: string;
};
