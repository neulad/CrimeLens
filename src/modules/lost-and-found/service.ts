import { queryClient as sql } from '../../db/client';
import { newId } from '../../lib/ids';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LostItem {
  id: string;
  userId: string;
  title: string;
  category: string;
  status: string;
  city: string;
  occurredAt: Date;
  description: string;
  createdAt: Date;
}

export interface CreateItemParams {
  userId: string;
  title: string;
  category: string;
  status: string;
  city: string;
  occurredAt: string; // ISO date string from form
  description: string;
}

// ---------------------------------------------------------------------------
// listItems — public, newest first
// ---------------------------------------------------------------------------

export async function listItems(): Promise<LostItem[]> {
  return sql<LostItem[]>`
    SELECT
      id,
      user_id      AS "userId",
      title,
      category,
      status,
      city,
      occurred_at  AS "occurredAt",
      description,
      created_at   AS "createdAt"
    FROM lost_items
    ORDER BY created_at DESC
    LIMIT 200
  `;
}

// ---------------------------------------------------------------------------
// createItem — authenticated
// ---------------------------------------------------------------------------

export async function createItem(params: CreateItemParams): Promise<string> {
  const id = newId();
  await sql`
    INSERT INTO lost_items (id, user_id, title, category, status, city, occurred_at, description)
    VALUES (
      ${id}::uuid,
      ${params.userId}::uuid,
      ${params.title.trim()},
      ${params.category},
      ${params.status},
      ${params.city.trim()},
      ${params.occurredAt}::timestamptz,
      ${params.description.trim()}
    )
  `;
  return id;
}

// ---------------------------------------------------------------------------
// deleteItem — ownership-checked delete
// ---------------------------------------------------------------------------

export async function deleteItem(id: string, userId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM lost_items
    WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
  `;
  return result.count > 0;
}
