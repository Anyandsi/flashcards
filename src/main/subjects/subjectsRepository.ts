import { randomUUID } from 'node:crypto';
import type { CreateSubjectInput, Subject } from '../../models/subjects';
import { getDatabase } from '../db/database';

type SubjectRow = {
  id: string;
  name: string;
  created_at: string;
};

function toSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function listSubjects(): Subject[] {
  const rows = getDatabase()
    .prepare('SELECT id, name, created_at FROM subjects ORDER BY created_at ASC')
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
    createdAt: new Date().toISOString(),
  };

  getDatabase()
    .prepare('INSERT INTO subjects (id, name, created_at) VALUES (@id, @name, @createdAt)')
    .run(subject);

  return subject;
}
