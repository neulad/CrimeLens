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

  const occurredAtISO = new Date(incident.occurredAt).toISOString();
  const occurredAtValue = occurredAtISO.slice(0, 10);
  const occurredAtTime = occurredAtISO.slice(11, 16);

  const crimeOptions = [
    { value: 'pickpocketing',  label: 'Pickpocketing' },
    { value: 'bicycle_stolen', label: 'Bicycle stolen' },
    { value: 'street_fight',   label: 'Street fight' },
    { value: 'robbery',        label: 'Robbery' },
    { value: 'street_scams',   label: 'Street scam' },
  ];

  return (
    <InnerPage title={`${crimeLabel} — ${incident.city} | CrimeLens`} userEmail={userEmail}>
      <form id="incident-edit-form" action={`/incidents/${incident.id}/edit`} method="post">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div class="incident-hero">
        <div class="incident-hero__badges">
          <span class={badgeClass} safe>{crimeLabel.toUpperCase()}</span>{' '}
          <span class={srcClass} safe>{sourceLabel.toUpperCase()}</span>
        </div>
        <h2 class="incident-hero__title" safe>{crimeLabel}</h2>
        <p class="incident-hero__meta" safe>{date} &mdash; {incident.city}</p>
      </div>

      {/* ── Description card ────────────────────────────────────────── */}
      <div class="incident-card">
        <p class="incident-card__label">What happened</p>
        <p class="incident-card__text view-mode" safe>{incident.description}</p>
        <textarea name="description" class="incident-inline-input edit-mode" rows="5" maxlength="1000" style="display:none" safe>{incident.description}</textarea>
      </div>

      {/* ── Details grid ────────────────────────────────────────────── */}
      <div class="incident-details">
        <div class="incident-detail">
          <span class="incident-detail__label">Crime type</span>
          <span class="incident-detail__value view-mode" safe>{crimeLabel}</span>
          <select name="crimeType" class="incident-inline-input edit-mode" style="display:none">
            {crimeOptions.map((o) => (
              <option value={o.value} selected={o.value === incident.crimeType ? 'true' : undefined}>{o.label}</option>
            ))}
          </select>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Date &amp; time</span>
          <span class="incident-detail__value view-mode" safe>{date}, {time}</span>
          <div class="edit-mode" style="display:none;gap:0.5rem;flex:1">
            <input type="date" name="occurredAtDate" value={occurredAtValue} class="incident-inline-input" style="flex:1" />
            <input type="time" name="occurredAtTime" value={occurredAtTime} class="incident-inline-input" style="flex:1" />
          </div>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">City</span>
          <span class="incident-detail__value" safe>{incident.city}</span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Coordinates</span>
          <span class="incident-detail__value">
            <a href={osmUrl} target="_blank" rel="noopener noreferrer">{lat}, {lng} ↗</a>
          </span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Source</span>
          <span class="incident-detail__value" safe>{sourceLabel}</span>
        </div>
        <div class="incident-detail">
          <span class="incident-detail__label">Incident ID</span>
          <span class="incident-detail__value"><code class="incident-id" safe>{incident.id}</code></span>
        </div>
      </div>

      {/* ── Owner actions ────────────────────────────────────────────── */}
      <div class="incident-actions">
        {isOwner ? (
          <>
            {/* View mode buttons */}
            <button type="button" id="edit-toggle-btn" class="contrast incident-action-btn view-mode" onclick="enterEditMode()">
              Edit incident
            </button>

            {/* Edit mode buttons */}
            <div class="incident-actions__row edit-mode" style="display:none">
              <button type="submit" class="contrast incident-action-btn">
                Save changes
              </button>
              <button type="button" class="incident-action-btn incident-action-btn--cancel" onclick="exitEditMode()">
                Cancel
              </button>
            </div>

            {/* Delete — always visible for owner */}
            <button type="button" class="incident-action-btn incident-action-btn--danger" onclick="openModal('delete-confirm-modal')">
              DELETE
            </button>

            {/* ── Delete confirmation modal ──────────────────────────── */}
            <div id="delete-confirm-modal" class="modal-overlay" onclick="if(event.target===this)closeModal('delete-confirm-modal')">
              <div class="modal-box">
                <p style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem">Delete this incident?</p>
                <p style="font-size:0.875rem;color:#6b7280;margin:0 0 1.5rem">This action cannot be undone.</p>
                <div style="display:flex;gap:0.75rem;justify-content:center">
                  <button type="button" class="outline secondary" style="flex:1" onclick="closeModal('delete-confirm-modal')">Cancel</button>
                  <form action={`/incidents/${incident.id}/delete`} method="post" style="flex:1">
                    <button type="submit" style="width:100%;background:#dc2626;color:#fff;border:none;border-radius:0.375rem;padding:0.5rem 1rem;font-weight:600;cursor:pointer">Delete</button>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div class="incident-actions__locked" title="Only the reporter can edit this incident">
            <span class="incident-action-btn incident-action-btn--disabled">Edit incident</span>
            <span class="incident-action-btn incident-action-btn--disabled">DELETE</span>
            <span class="incident-actions__hint">
              {userId ? "You didn't report this incident." : 'Sign in to manage your reports.'}
            </span>
          </div>
        )}
      </div>

      </form>

      {isOwner ? (
        <script>{`
          function enterEditMode() {
            document.querySelectorAll('.edit-mode').forEach(function(el) {
              el.style.display = el.tagName === 'DIV' ? 'flex' : '';
            });
            document.querySelectorAll('.view-mode').forEach(function(el) { el.style.display = 'none'; });
          }
          function exitEditMode() {
            document.querySelectorAll('.edit-mode').forEach(function(el) { el.style.display = 'none'; });
            document.querySelectorAll('.view-mode').forEach(function(el) { el.style.display = ''; });
          }
        `}</script>
      ) : ''}
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
