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

// ---------------------------------------------------------------------------
// LostFoundListPage — public list
// ---------------------------------------------------------------------------

export function LostFoundListPage({
  items,
  userEmail,
  userId,
}: {
  items: LostItem[];
  userEmail?: string | undefined;
  userId?: string | undefined;
}): string {
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

      {items.length === 0 ? (
        <p style="color:#6b7280; margin-top:2rem">No items reported yet.</p>
      ) : (
        <div class="lf-list">
          {items.map((item) => (
            <div class="lf-card">
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
              <h3 class="lf-card__title" safe>
                {item.title}
              </h3>
              <p class="lf-card__city" safe>
                {item.city}
              </p>
              <p class="lf-card__desc" safe>
                {item.description}
              </p>
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
              ) : (
                ''
              )}
            </div>
          ))}
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
        <p class="auth-error" safe>
          {error}
        </p>
      ) : (
        ''
      )}
      <form action="/lost-and-found" method="post" style="max-width: 520px">
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
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Blue iPhone 14, Brown leather wallet"
            maxlength="120"
          />
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
          <textarea
            name="description"
            required
            rows="4"
            placeholder="Describe the item and where it was lost or found…"
            maxlength="1000"
          />
        </label>

        <button type="submit" class="contrast">
          Submit report
        </button>
      </form>
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
        <a href="/auth">Sign in</a> or <a href="/auth/register">create an account</a>
      </p>
    </InnerPage>
  );
}
