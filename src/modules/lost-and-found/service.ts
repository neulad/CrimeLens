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
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactTelegram: string | null;
  imageData: string | null;
}

export interface CreateItemParams {
  userId: string;
  title: string;
  category: string;
  status: string;
  city: string;
  occurredAt: string;
  description: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactTelegram?: string;
  imageData?: string;
}

const SELECT_COLS = sql`
  id, user_id AS "userId", title, category, status, city,
  occurred_at AS "occurredAt", description, created_at AS "createdAt",
  contact_phone AS "contactPhone", contact_whatsapp AS "contactWhatsapp",
  contact_telegram AS "contactTelegram", image_data AS "imageData"
`;

// ---------------------------------------------------------------------------
// listItems — public, newest first, optional filters
// ---------------------------------------------------------------------------

export async function listItems(filters?: {
  status?: 'LOST' | 'FOUND';
  onlyUserId?: string;
}): Promise<LostItem[]> {
  const st = filters?.status;
  const uid = filters?.onlyUserId;

  if (st && uid) {
    return sql<LostItem[]>`
      SELECT ${SELECT_COLS} FROM lost_items
      WHERE status = ${st} AND user_id = ${uid}::uuid
      ORDER BY created_at DESC LIMIT 200
    `;
  }
  if (st) {
    return sql<LostItem[]>`
      SELECT ${SELECT_COLS} FROM lost_items
      WHERE status = ${st}
      ORDER BY created_at DESC LIMIT 200
    `;
  }
  if (uid) {
    return sql<LostItem[]>`
      SELECT ${SELECT_COLS} FROM lost_items
      WHERE user_id = ${uid}::uuid
      ORDER BY created_at DESC LIMIT 200
    `;
  }
  return sql<LostItem[]>`
    SELECT ${SELECT_COLS} FROM lost_items
    ORDER BY created_at DESC LIMIT 200
  `;
}

// ---------------------------------------------------------------------------
// createItem — authenticated
// ---------------------------------------------------------------------------

export async function createItem(params: CreateItemParams): Promise<string> {
  const id = newId();
  await sql`
    INSERT INTO lost_items (
      id, user_id, title, category, status, city, occurred_at, description,
      contact_phone, contact_whatsapp, contact_telegram, image_data
    ) VALUES (
      ${id}::uuid,
      ${params.userId}::uuid,
      ${params.title.trim()},
      ${params.category},
      ${params.status},
      ${params.city.trim()},
      ${params.occurredAt}::timestamptz,
      ${params.description.trim()},
      ${params.contactPhone?.trim() || null},
      ${params.contactWhatsapp?.trim() || null},
      ${params.contactTelegram?.trim() || null},
      ${params.imageData || null}
    )
  `;
  return id;
}

// ---------------------------------------------------------------------------
// deleteItem — ownership-checked delete
// ---------------------------------------------------------------------------

export async function deleteItem(id: string, userId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM lost_items WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
  `;
  return result.count > 0;
}
