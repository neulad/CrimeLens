// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';
import type { IncidentRow } from './queries';

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

const CRIME_LABEL: Record<string, string> = {
  pickpocketing:  'Pickpocketing',
  bicycle_stolen: 'Bicycle stolen',
  street_fight:   'Street fight',
  robbery:        'Robbery',
  street_scams:   'Street scam',
};

const CRIME_BADGE: Record<string, string> = {
  pickpocketing:  'badge-pickpocketing',
  bicycle_stolen: 'badge-bicycle-stolen',
  street_fight:   'badge-street-fight',
  robbery:        'badge-robbery',
  street_scams:   'badge-street-scams',
};

const SOURCE_BADGE: Record<string, string> = {
  SEEDED: 'badge-seeded',
  USER_REPORTED: 'badge-user',
};

const SOURCE_LABEL: Record<string, string> = {
  SEEDED: 'Seeded dataset',
  USER_REPORTED: 'User report',
};

// ---------------------------------------------------------------------------
// IncidentDetailPage
// ---------------------------------------------------------------------------

export function IncidentDetailPage({
  incident,
  userEmail,
  userId,
}: {
  incident: IncidentRow;
  userEmail?: string | undefined;
  userId?: string | undefined;
}): string {
  const isOwner = !!userId && userId === incident.createdBy;
  const crimeLabel = CRIME_LABEL[incident.crimeType] ?? incident.crimeType;
  const badgeClass = `badge ${CRIME_BADGE[incident.crimeType] ?? 'badge-other'}`;
  const srcClass = `badge ${SOURCE_BADGE[incident.source] ?? 'badge-other'}`;
  const sourceLabel = SOURCE_LABEL[incident.source] ?? incident.source;

  const date = new Date(incident.occurredAt).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const time = new Date(incident.occurredAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const lat = incident.lat.toFixed(5);
  const lng = incident.lng.toFixed(5);
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;

  return (
    <InnerPage title={`${crimeLabel} — ${incident.city} | CrimeLens`} userEmail={userEmail}>
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div class="incident-hero">
        <div class="incident-hero__badges">
          <span class={badgeClass} safe>
            {crimeLabel.toUpperCase()}
          </span>{' '}
          <span class={srcClass} safe>
            {sourceLabel.toUpperCase()}
          </span>
        </div>
        <h2 class="incident-hero__title" safe>
          {crimeLabel}
        </h2>
        <p class="incident-hero__meta" safe>
          {date} &mdash; {incident.city}
        </p>
      </div>

      {/* ── Description card ────────────────────────────────────────── */}
      <div class="incident-card">
        <p class="incident-card__label">What happened</p>
        <p class="incident-card__text" safe>
          {incident.description}
        </p>
      </div>

      {/* ── Details grid ────────────────────────────────────────────── */}
      <div class="incident-details">
        <div class="incident-detail">
          <span class="incident-detail__label">Date &amp; time</span>
          <span class="incident-detail__value" safe>
            {date}, {time}
          </span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">City</span>
          <span class="incident-detail__value" safe>
            {incident.city}
          </span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Coordinates</span>
          <span class="incident-detail__value">
            <a href={osmUrl} target="_blank" rel="noopener noreferrer">
              {lat}, {lng} ↗
            </a>
          </span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Source</span>
          <span class="incident-detail__value" safe>
            {sourceLabel}
          </span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Incident ID</span>
          <span class="incident-detail__value">
            <code class="incident-id" safe>
              {incident.id}
            </code>
          </span>
        </div>
      </div>

      {/* ── Owner actions ────────────────────────────────────────────── */}
      <div class="incident-actions">
        {isOwner ? (
          <>
            <a href={`/incidents/${incident.id}/edit`} role="button" class="contrast incident-action-btn">
              ✏️ Edit incident
            </a>
            <form action={`/incidents/${incident.id}/delete`} method="post" style="display:inline">
              <button
                type="submit"
                class="outline secondary incident-action-btn incident-action-btn--danger"
                onclick="return confirm('Delete this incident permanently?')"
              >
                🗑 Delete
              </button>
            </form>
          </>
        ) : (
          <div class="incident-actions__locked" title="Only the reporter can edit this incident">
            <span class="incident-action-btn incident-action-btn--disabled">✏️ Edit incident</span>
            <span class="incident-action-btn incident-action-btn--disabled">🗑 Delete</span>
            <span class="incident-actions__hint">
              {userId
                ? "You didn't report this incident."
                : 'Sign in to manage your reports.'}
            </span>
          </div>
        )}
      </div>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// IncidentEditPage
// ---------------------------------------------------------------------------

const CRIME_OPTIONS = [
  { value: 'pickpocketing',  label: 'Pickpocketing' },
  { value: 'bicycle_stolen', label: 'Bicycle stolen' },
  { value: 'street_fight',   label: 'Street fight' },
  { value: 'robbery',        label: 'Robbery' },
  { value: 'street_scams',   label: 'Street scam' },
];

export function IncidentEditPage({
  incident,
  userEmail,
  error,
}: {
  incident: IncidentRow;
  userEmail: string;
  error?: string | undefined;
}): string {
  const occurredAtValue = new Date(incident.occurredAt).toISOString().slice(0, 10);

  return (
    <InnerPage title="Edit incident | CrimeLens" userEmail={userEmail}>
      <div style="max-width:520px">
        <a href={`/incidents/${incident.id}`} style="font-size:0.875rem">← Back to incident</a>
        <h2 style="margin-top:1rem">Edit incident</h2>

        {error ? <p class="auth-error" safe>{error}</p> : ''}

        <form action={`/incidents/${incident.id}/edit`} method="post">
          <label>
            Crime type
            <select name="crimeType" required>
              {CRIME_OPTIONS.map((o) => (
                <option value={o.value} selected={o.value === incident.crimeType ? 'true' : undefined}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date of incident
            <input type="date" name="occurredAt" required value={occurredAtValue} />
          </label>

          <label>
            Description
            <textarea name="description" required rows="5" maxlength="1000" safe>
              {incident.description}
            </textarea>
          </label>

          <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
            <button type="submit" class="contrast">Save changes</button>
            <a href={`/incidents/${incident.id}`} role="button" class="outline secondary">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// NotFoundPage  (reusable 404 shell for incidents)
// ---------------------------------------------------------------------------

export function IncidentNotFoundPage({ userEmail }: { userEmail?: string | undefined }): string {
  return (
    <InnerPage title="Incident not found | CrimeLens" userEmail={userEmail}>
      <h2>Incident not found</h2>
      <p>This incident may have been removed or the link is incorrect.</p>
    </InnerPage>
  );
}
