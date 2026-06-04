// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';
import type { LostItem } from './service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<string, string> = {
  phone: 'Phone',
  bag: 'Bag',
  wallet: 'Wallet',
  keys: 'Keys',
  documents: 'Documents',
  other: 'Other',
};

const STATUS_LABEL: Record<string, string> = {
  LOST: 'Lost',
  FOUND: 'Found',
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Messenger chip icons (inline SVG)
const ICONS = {
  whatsapp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  telegram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  phone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l.75-.76a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
};

function contactChip(type: 'whatsapp' | 'telegram' | 'phone', value: string): string {
  const v = value.replace(/^@/, '').trim();
  let href = '#';
  let label = v;
  if (type === 'whatsapp') { href = `https://wa.me/${v.replace(/\D/g, '')}`; label = `+${v.replace(/\D/g, '')}`; }
  if (type === 'telegram') { href = `https://t.me/${v}`; label = `@${v}`; }
  if (type === 'phone')    { href = `tel:${v.replace(/\s/g, '')}`; label = v; }

  const icon = ICONS[type];
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="contact-chip contact-chip--${type}">
    ${icon}<span>${Html.escapeHtml(label)}</span>
  </a>`;
}

// ---------------------------------------------------------------------------
// LostFoundListPage — public list with toggles
// ---------------------------------------------------------------------------

export function LostFoundListPage({
  items,
  userEmail,
  userId,
  statusFilter,
  ownerFilter,
}: {
  items: LostItem[];
  userEmail?: string | undefined;
  userId?: string | undefined;
  statusFilter: 'ALL' | 'LOST' | 'FOUND';
  ownerFilter: 'ALL' | 'MINE';
}): string {
  // Build toggle URLs
  function toggleUrl(params: { status?: string; owner?: string }) {
    const s = params.status ?? statusFilter;
    const o = params.owner ?? ownerFilter;
    return `/lost-and-found?status=${s}&owner=${o}`;
  }

  return (
    <InnerPage title="Lost & Found | CrimeLens" userEmail={userEmail}>
      <div class="lf-header">
        <h2 style="margin:0">Lost &amp; Found</h2>
        {userEmail ? (
          <a href="/lost-and-found/new" role="button" class="contrast lf-new-btn">
            + Report item
          </a>
        ) : (
          <a href="/auth" class="outline lf-new-btn">
            Sign in to report
          </a>
        )}
      </div>

      {/* ── Toggle bar ─────────────────────────────────────────────────── */}
      <div class="lf-toggles">
        {/* Lost / Found toggle */}
        <div class="lf-toggle-group">
          <a
            href={toggleUrl({ status: 'ALL' })}
            class={`lf-toggle${statusFilter === 'ALL' ? ' lf-toggle--active' : ''}`}
          >
            All
          </a>
          <a
            href={toggleUrl({ status: 'LOST' })}
            class={`lf-toggle${statusFilter === 'LOST' ? ' lf-toggle--active lf-toggle--lost' : ''}`}
          >
            Lost
          </a>
          <a
            href={toggleUrl({ status: 'FOUND' })}
            class={`lf-toggle${statusFilter === 'FOUND' ? ' lf-toggle--active lf-toggle--found' : ''}`}
          >
            Found
          </a>
        </div>

        {/* My / Others toggle — only if signed in */}
        {userId ? (
          <div class="lf-toggle-group">
            <a
              href={toggleUrl({ owner: 'ALL' })}
              class={`lf-toggle${ownerFilter === 'ALL' ? ' lf-toggle--active' : ''}`}
            >
              Everyone's
            </a>
            <a
              href={toggleUrl({ owner: 'MINE' })}
              class={`lf-toggle${ownerFilter === 'MINE' ? ' lf-toggle--active' : ''}`}
            >
              Mine
            </a>
          </div>
        ) : ''}
      </div>

      {/* ── List ──────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <p style="color:#6b7280;margin-top:2rem">No items found.</p>
      ) : (
        <div class="lf-list">
          {items.map((item) => {
            const chips: string[] = [];
            if (item.contactPhone) chips.push(contactChip('phone', item.contactPhone));
            if (item.contactWhatsapp) chips.push(contactChip('whatsapp', item.contactWhatsapp));
            if (item.contactTelegram) chips.push(contactChip('telegram', item.contactTelegram));

            return (
              <div class="lf-card">
                {/* Image */}
                {item.imageData ? (
                  <img
                    src={`data:image/jpeg;base64,${item.imageData}`}
                    alt="Item photo"
                    class="lf-card__image"
                    loading="lazy"
                  />
                ) : ''}

                <div class="lf-card__top">
                  <span class={`badge badge-${item.status.toLowerCase()}`} safe>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                  <span class="badge badge-other" safe>
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </span>
                  <span class="lf-card__date" safe>
                    {formatDate(item.occurredAt)}
                  </span>
                </div>
                <h3 class="lf-card__title" safe>{item.title}</h3>
                <p class="lf-card__city" safe>{item.city}</p>
                <p class="lf-card__desc" safe>{item.description}</p>

                {/* Contact chips */}
                {chips.length > 0 ? (
                  <div class="lf-card__contacts">
                    {chips.join('')}
                  </div>
                ) : ''}

                {/* Delete own items */}
                {userId === item.userId ? (
                  <form
                    action={`/lost-and-found/${item.id}/delete`}
                    method="post"
                    class="lf-card__delete-form"
                  >
                    <button type="submit" class="outline secondary lf-delete-btn">
                      Delete
                    </button>
                  </form>
                ) : ''}
              </div>
            );
          })}
        </div>
      )}
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// LostFoundNewPage — submission form (authenticated only)
// ---------------------------------------------------------------------------

export function LostFoundNewPage({
  userEmail,
  error,
}: {
  userEmail: string;
  error?: string | undefined;
}): string {
  return (
    <InnerPage title="Report item | CrimeLens" userEmail={userEmail}>
      <h2>Report a lost or found item</h2>
      {error ? (
        <p class="auth-error" safe>{error}</p>
      ) : ''}
      <form
        action="/lost-and-found"
        method="post"
        enctype="multipart/form-data"
        style="max-width: 520px"
      >
        {/* Status */}
        <fieldset>
          <legend>I am reporting a…</legend>
          <label>
            <input type="radio" name="status" value="LOST" checked />
            Lost item (I lost something)
          </label>
          <label>
            <input type="radio" name="status" value="FOUND" />
            Found item (I found something)
          </label>
        </fieldset>

        {/* Title */}
        <label>
          Item name
          <input type="text" name="title" required placeholder="e.g. Blue iPhone 14, Brown leather wallet" maxlength="120" />
        </label>

        {/* Category */}
        <label>
          Category
          <select name="category" required>
            <option value="phone">Phone</option>
            <option value="bag">Bag</option>
            <option value="wallet">Wallet</option>
            <option value="keys">Keys</option>
            <option value="documents">Documents</option>
            <option value="other">Other</option>
          </select>
        </label>

        {/* City */}
        <label>
          City
          <input type="text" name="city" required placeholder="e.g. Prague" maxlength="100" />
        </label>

        {/* Date */}
        <label>
          Date lost / found
          <input type="date" name="occurredAt" required />
        </label>

        {/* Description */}
        <label>
          Description
          <textarea name="description" required rows="4" placeholder="Describe the item and where it was lost or found…" maxlength="1000" />
        </label>

        {/* Photo */}
        <label>
          Photo (optional, max 5 MB)
          <input type="file" name="image" accept="image/*" id="lf-image-input" />
        </label>
        <canvas id="lf-image-canvas" style="display:none" />
        <input type="hidden" name="imageData" id="lf-image-data" />
        <div id="lf-image-preview" style="margin-top:0.5rem" />

        {/* Contacts */}
        <p style="font-size:0.875rem;font-weight:700;margin:1.25rem 0 0.5rem;color:#374151">
          Contact details (optional)
        </p>
        <p style="font-size:0.8rem;color:#6b7280;margin:0 0 0.75rem">
          At least one contact is recommended so people can reach you.
        </p>

        <label>
          Phone number
          <input type="tel" name="contactPhone" placeholder="+421912345678" />
        </label>
        <label>
          WhatsApp (number with country code)
          <input type="text" name="contactWhatsapp" placeholder="+421912345678" />
        </label>
        <label>
          Telegram (username without @)
          <input type="text" name="contactTelegram" placeholder="username" />
        </label>

        <button type="submit" class="contrast">Submit report</button>
      </form>

      {/* Client-side image compression */}
      <script>{`
        (function() {
          const input = document.getElementById('lf-image-input');
          const canvas = document.getElementById('lf-image-canvas');
          const hiddenInput = document.getElementById('lf-image-data');
          const preview = document.getElementById('lf-image-preview');
          const MAX_DIM = 1024;
          const MAX_BYTES = 4.5 * 1024 * 1024; // 4.5 MB base64 budget

          if (!input) return;
          input.addEventListener('change', function() {
            const file = input.files && input.files[0];
            if (!file) { hiddenInput.value = ''; preview.innerHTML = ''; return; }

            if (file.size > 10 * 1024 * 1024) {
              preview.innerHTML = '<p style="color:#991b1b;font-size:0.875rem">Image too large (max 10 MB). Please choose a smaller file.</p>';
              input.value = '';
              return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
              const img = new Image();
              img.onload = function() {
                let w = img.width, h = img.height;
                if (w > MAX_DIM || h > MAX_DIM) {
                  if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
                  else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
                }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                // Compress to JPEG, reducing quality until under budget
                let quality = 0.82;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                while (dataUrl.length > MAX_BYTES && quality > 0.3) {
                  quality -= 0.1;
                  dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                if (dataUrl.length > MAX_BYTES) {
                  preview.innerHTML = '<p style="color:#991b1b;font-size:0.875rem">Image still too large after compression. Please use a smaller image.</p>';
                  hiddenInput.value = '';
                  input.value = '';
                  return;
                }

                hiddenInput.value = dataUrl.split(',')[1]; // base64 only
                preview.innerHTML = '<img src="' + dataUrl + '" style="max-width:100%;max-height:200px;border-radius:0.375rem;margin-top:0.25rem;border:1px solid #e5e7eb" alt="Preview" />';
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
        })();
      `}</script>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// LostFoundUnauthorizedPage
// ---------------------------------------------------------------------------

export function LostFoundUnauthorizedPage(): string {
  return (
    <InnerPage title="Sign in required | CrimeLens">
      <h2>Sign in required</h2>
      <p>You need to be signed in to report lost or found items.</p>
      <p>
        <a href="/auth">Sign in</a>
      </p>
    </InnerPage>
  );
}
