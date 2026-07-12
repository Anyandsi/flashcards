import { randomUUID } from 'node:crypto';
import type { CreateSubjectInput, Subject } from '../../models/subjects';
import { getDatabase } from '../db/database';

type SubjectRow = {
  id: string;
  name: string;
};

type SettingRow = {
  value: string | null;
};

function toSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
  };
}

export function listSubjects(): Subject[] {
  const rows = getDatabase()
    .prepare('SELECT id, name FROM subjects ORDER BY name COLLATE NOCASE ASC')
    .all() as SubjectRow[];

  return rows.map(toSubject);
}

export function createSubject(input: CreateSubjectInput): Subject {
  const name = input.name.trim();

  if (!name) {
    throw new Error('Subject name is required');
  }

  const subject: Subject = {
    id: randomUUID(),
    name,
  };

  getDatabase().prepare('INSERT INTO subjects (id, name) VALUES (@id, @name)').run(subject);

  if (!getCurrentSubjectId()) {
    setCurrentSubjectId(subject.id);
  }

  return subject;
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
