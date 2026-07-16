import { randomUUID } from 'node:crypto';
import type {
  CreateSubjectInput,
  Session,
  SessionHistoryItem,
  Subject,
} from '../../models/subjects';
import type { DeletionReceipt } from '../../models/deletions';
import { getDatabase } from '../db/database';
import { createDeletionReceipt } from '../deletions/deletionsRepository';

type SubjectRow = {
  created_at: string;
  id: string;
  name: string;
  time_spent: number;
};

type StoredDeckRow = {
  id: string;
  name: string;
  subject_id: string;
};

type StoredCardRow = {
  contents_json: string;
  deck_id: string;
  id: string;
  last_review_date: string | null;
  position: number;
  review_rating: string | null;
  title: string;
};

type SessionRow = {
  id: string;
  subject_id: string;
  created_at: string;
  duration_seconds: number;
};

type SessionHistoryRow = SessionRow & {
  subject_name: string;
};

type SettingRow = {
  value: string | null;
};

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    createdAt: row.created_at,
    durationSeconds: row.duration_seconds,
  };
}

function toSessionHistoryItem(row: SessionHistoryRow): SessionHistoryItem {
  return {
    ...toSession(row),
    subjectId: row.subject_id,
    subjectName: row.subject_name,
  };
}

function toSubject(row: SubjectRow, sessions: Session[]): Subject {
  return {
    id: row.id,
    name: row.name,
    timeSpent: row.time_spent,
    sessions,
  };
}

export function listSubjects(): Subject[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT id, name, time_spent FROM subjects ORDER BY name COLLATE NOCASE ASC')
    .all() as SubjectRow[];
  const sessionRows = db
    .prepare(
      `
      SELECT id, subject_id, created_at, duration_seconds
      FROM sessions
      ORDER BY created_at DESC
      `,
    )
    .all() as SessionRow[];
  const sessionsBySubjectId = new Map<string, Session[]>();

  for (const sessionRow of sessionRows) {
    const sessions = sessionsBySubjectId.get(sessionRow.subject_id) ?? [];
    sessions.push(toSession(sessionRow));
    sessionsBySubjectId.set(sessionRow.subject_id, sessions);
  }

  return rows.map((row) => toSubject(row, sessionsBySubjectId.get(row.id) ?? []));
}

export function listSessions(): SessionHistoryItem[] {
  const rows = getDatabase()
    .prepare(
      `
      SELECT
        sessions.id,
        sessions.subject_id,
        subjects.name AS subject_name,
        sessions.created_at,
        sessions.duration_seconds
      FROM sessions
      INNER JOIN subjects ON subjects.id = sessions.subject_id
      ORDER BY sessions.created_at DESC
      `,
    )
    .all() as SessionHistoryRow[];

  return rows.map(toSessionHistoryItem);
}

export function createSubject(input: CreateSubjectInput): Subject {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Subject name is required');
  }

  const subject: Subject = {
    id: randomUUID(),
    name,
    timeSpent: 0,
    sessions: [],
  };

  getDatabase()
    .prepare(
      `
      INSERT INTO subjects (id, name, time_spent, created_at)
      VALUES (@id, @name, @timeSpent, @createdAt)
      `,
    )
    .run({
      ...subject,
      createdAt: new Date().toISOString(),
    });

  if (!getCurrentSubjectId()) {
    setCurrentSubjectId(subject.id);
  }

  return subject;
}

export function deleteSubject(subjectId: string): DeletionReceipt {
  const db = getDatabase();
  const subject = db
    .prepare('SELECT id, name, time_spent, created_at FROM subjects WHERE id = ?')
    .get(subjectId) as SubjectRow | undefined;

  if (!subject) {
    throw new Error('Subject does not exist');
  }

  const decks = db
    .prepare('SELECT id, name, subject_id FROM decks WHERE subject_id = ?')
    .all(subjectId) as StoredDeckRow[];
  const cards = db
    .prepare(
      `
      SELECT cards.id, cards.title, cards.contents_json, cards.deck_id, cards.position,
             cards.review_rating, cards.last_review_date
      FROM cards
      INNER JOIN decks ON decks.id = cards.deck_id
      WHERE decks.subject_id = ?
      ORDER BY cards.deck_id, cards.position
      `,
    )
    .all(subjectId) as StoredCardRow[];
  const sessions = db
    .prepare('SELECT id, subject_id, created_at, duration_seconds FROM sessions WHERE subject_id = ?')
    .all(subjectId) as SessionRow[];
  const wasCurrent = getCurrentSubjectId() === subjectId;
  const deleteStoredSubject = db.transaction(() => {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(subjectId);

    if (wasCurrent) {
      const replacementId = db
        .prepare('SELECT id FROM subjects ORDER BY name COLLATE NOCASE ASC LIMIT 1')
        .pluck()
        .get() as string | undefined;
      db.prepare(
        `
        INSERT INTO app_settings (key, value)
        VALUES ('current_subject_id', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `,
      ).run(replacementId ?? null);
    }
  });

  deleteStoredSubject();

  return createDeletionReceipt('subject', subject.name, () => {
    const restoreSubject = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO subjects (id, name, time_spent, created_at)
        VALUES (@id, @name, @time_spent, @created_at)
        `,
      ).run(subject);

      const insertDeck = db.prepare(
        'INSERT INTO decks (id, name, subject_id) VALUES (@id, @name, @subject_id)',
      );
      for (const deck of decks) {
        insertDeck.run(deck);
      }

      const insertCard = db.prepare(
        `
        INSERT INTO cards
          (id, title, contents_json, deck_id, position, review_rating, last_review_date)
        VALUES
          (@id, @title, @contents_json, @deck_id, @position, @review_rating, @last_review_date)
        `,
      );
      for (const card of cards) {
        insertCard.run(card);
      }

      const insertSession = db.prepare(
        `
        INSERT INTO sessions (id, subject_id, created_at, duration_seconds)
        VALUES (@id, @subject_id, @created_at, @duration_seconds)
        `,
      );
      for (const session of sessions) {
        insertSession.run(session);
      }

      const currentSubjectId = db
        .prepare("SELECT value FROM app_settings WHERE key = 'current_subject_id'")
        .pluck()
        .get() as string | null | undefined;
      if (wasCurrent || !currentSubjectId) {
        db.prepare(
          `
          INSERT INTO app_settings (key, value)
          VALUES ('current_subject_id', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `,
        ).run(subject.id);
      }
    });

    restoreSubject();
  });
}

export function recordSubjectSession(
  subjectId: string,
  durationSeconds: number,
  createdAt = new Date().toISOString(),
): Session {
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Session duration must be a positive number of seconds');
  }

  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error('Session date is invalid');
  }

  const session: Session = {
    id: randomUUID(),
    createdAt,
    durationSeconds,
  };
  const db = getDatabase();
  const createSession = db.transaction(() => {
    const result = db
      .prepare('UPDATE subjects SET time_spent = time_spent + ? WHERE id = ?')
      .run(durationSeconds, subjectId);

    if (!result.changes) {
      throw new Error('Subject does not exist');
    }

    db.prepare(
      `
      INSERT INTO sessions (id, subject_id, created_at, duration_seconds)
      VALUES (@id, @subjectId, @createdAt, @durationSeconds)
      `,
    ).run({
      ...session,
      subjectId,
    });
  });

  createSession();

  return session;
}

export function deleteSession(sessionId: string): string {
  const db = getDatabase();
  const deleteStoredSession = db.transaction(() => {
    const session = db
      .prepare('SELECT subject_id, duration_seconds FROM sessions WHERE id = ?')
      .get(sessionId) as Pick<SessionRow, 'subject_id' | 'duration_seconds'> | undefined;

    if (!session) {
      throw new Error('Session does not exist');
    }

    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    db.prepare(
      `
      UPDATE subjects
      SET time_spent = MAX(time_spent - ?, 0)
      WHERE id = ?
      `,
    ).run(session.duration_seconds, session.subject_id);
  });

  deleteStoredSession();

  return sessionId;
}

export function getCurrentSubjectId(): string | null {
  const row = getDatabase()
    .prepare("SELECT value FROM app_settings WHERE key = 'current_subject_id'")
    .get() as SettingRow | undefined;

  return row?.value ?? null;
}

export function setCurrentSubjectId(subjectId: string): string {
  const subject = getDatabase()
    .prepare('SELECT id FROM subjects WHERE id = ?')
    .get(subjectId) as Pick<SubjectRow, 'id'> | undefined;

  if (!subject) {
    throw new Error('Subject does not exist');
  }

  getDatabase()
    .prepare(
      `
      INSERT INTO app_settings (key, value)
      VALUES ('current_subject_id', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
    )
    .run(subjectId);

  return subjectId;
}
