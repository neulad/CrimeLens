// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';
import type { ProfileRow } from './service';

// ---------------------------------------------------------------------------
// Messenger chip helper
// ---------------------------------------------------------------------------

const CONTACT_ICONS: Record<string, string> = {
  whatsapp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  telegram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l.75-.76a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
};

function contactUrl(type: string, value: string): string {
  const v = value.replace(/^@/, '').trim();
  switch (type) {
    case 'whatsapp': return `https://wa.me/${v.replace(/\D/g, '')}`;
    case 'telegram': return `https://t.me/${v}`;
    case 'facebook': return `https://facebook.com/${v}`;
    case 'phone':    return `tel:${v.replace(/\s/g, '')}`;
    default: return '#';
  }
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------

export function ProfilePage({
  profile,
  userEmail,
  saved,
  error,
  emailChangeError,
  emailChangeSent,
}: {
  profile: ProfileRow;
  userEmail: string;
  saved?: boolean;
  error?: string | undefined;
  emailChangeError?: string | undefined;
  emailChangeSent?: boolean;
}): string {
  return (
    <InnerPage title="Your profile | CrimeLens" userEmail={userEmail}>
      <div style="max-width:520px">
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.75rem">
          <img
            src={profile.hasAvatar ? `/api/avatar/${profile.id}` : `https://api.dicebear.com/9.x/lorelei/svg?seed=${profile.id}`}
            alt="Avatar"
            style="width:64px;height:64px;border-radius:50%;border:2px solid #e5e7eb"
          />
          <div>
            <h2 style="margin:0" safe>{profile.firstName} {profile.lastName}</h2>
            <p style="margin:0;color:#6b7280;font-size:0.875rem" safe>{profile.email}</p>
            {profile.pendingEmail ? (
              <p style="margin:0.25rem 0 0;font-size:0.8rem;color:#d97706">
                ⏳ Pending email change to <strong safe>{profile.pendingEmail}</strong>
              </p>
            ) : ''}
          </div>
        </div>

        {/* ── Profile form ─────────────────────────────────────────────── */}
        {saved ? <p class="auth-success">✅ Profile saved.</p> : ''}
        {error ? <p class="auth-error" safe>{error}</p> : ''}

        <form action="/profile" method="post">
          <div style="display:flex;gap:0.75rem">
            <label style="flex:1">
              First name
              <input type="text" name="firstName" required value={profile.firstName} safe />
            </label>
            <label style="flex:1">
              Last name
              <input type="text" name="lastName" value={profile.lastName} safe />
            </label>
          </div>

          <p style="font-size:0.875rem;font-weight:700;margin:1.25rem 0 0.5rem;color:#374151">Contacts</p>
          <p style="font-size:0.8rem;color:#6b7280;margin:0 0 1rem">
            People can reach you via these when you post on Lost &amp; Found.
          </p>

          <label>
            <span style="display:flex;align-items:center;gap:0.4rem">
              {Html.raw(CONTACT_ICONS.whatsapp)} WhatsApp (number with country code)
            </span>
            <input type="text" name="contactWhatsapp" placeholder="+421912345678" value={profile.contactWhatsapp ?? ''} safe />
          </label>
          <label>
            <span style="display:flex;align-items:center;gap:0.4rem">
              {Html.raw(CONTACT_ICONS.telegram)} Telegram (username without @)
            </span>
            <input type="text" name="contactTelegram" placeholder="username" value={profile.contactTelegram ?? ''} safe />
          </label>
          <label>
            <span style="display:flex;align-items:center;gap:0.4rem">
              {Html.raw(CONTACT_ICONS.facebook)} Facebook (username or profile ID)
            </span>
            <input type="text" name="contactFacebook" placeholder="john.doe.123" value={profile.contactFacebook ?? ''} safe />
          </label>
          <label>
            <span style="display:flex;align-items:center;gap:0.4rem">
              {Html.raw(CONTACT_ICONS.phone)} Phone number
            </span>
            <input type="tel" name="contactPhone" placeholder="+421912345678" value={profile.contactPhone ?? ''} safe />
          </label>

          <button type="submit" class="contrast" style="margin-top:0.5rem">Save profile</button>
        </form>

        {/* ── Email change ─────────────────────────────────────────────── */}
        <hr style="margin:2rem 0;border-color:#e5e7eb" />
        <h3>Change email</h3>
        {emailChangeSent ? (
          <div>
            <p style="color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.375rem;padding:0.6rem 0.75rem;font-size:0.875rem">
              ✅ Verification code sent to your new address. Enter it below.
            </p>
            {emailChangeError ? <p class="auth-error" safe>{emailChangeError}</p> : ''}
            <form action="/profile/confirm-email" method="post" style="margin-top:1rem">
              <label>
                Verification code
                <input
                  type="text"
                  name="code"
                  required
                  autocomplete="one-time-code"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  placeholder="123456"
                  style="letter-spacing:0.25em;font-size:1.25rem;text-align:center"
                />
              </label>
              <button type="submit" class="contrast">Confirm new email</button>
            </form>
          </div>
        ) : (
          <div>
            {emailChangeError ? <p class="auth-error" safe>{emailChangeError}</p> : ''}
            <form action="/profile/change-email" method="post">
              <label>
                New email address
                <input type="email" name="newEmail" required placeholder="new@example.com" />
              </label>
              <button type="submit" class="outline">Send verification code</button>
            </form>
          </div>
        )}
      </div>
    </InnerPage>
  );
}
