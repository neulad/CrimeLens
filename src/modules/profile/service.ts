import { queryClient as sql } from '../../db/client';

export interface ProfileRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  hasAvatar: boolean;
  contactWhatsapp: string | null;
  contactTelegram: string | null;
  contactFacebook: string | null;
  contactPhone: string | null;
  pendingEmail: string | null;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const [row] = await sql<ProfileRow[]>`
    SELECT
      id,
      email,
      first_name        AS "firstName",
      last_name         AS "lastName",
      (avatar_svg <> '') AS "hasAvatar",
      contact_whatsapp  AS "contactWhatsapp",
      contact_telegram  AS "contactTelegram",
      contact_facebook  AS "contactFacebook",
      contact_phone     AS "contactPhone",
      pending_email     AS "pendingEmail"
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  return row ?? null;
}
