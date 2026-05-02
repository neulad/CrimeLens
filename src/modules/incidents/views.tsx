// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';
import type { IncidentRow } from './queries';

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

const CRIME_LABEL: Record<string, string> = {
  pickpocketing: 'Pickpocketing',
  bag_snatching: 'Bag snatching',
  theft_from_vehicle: 'Theft from vehicle',
  other: 'Other',
};

const CRIME_BADGE: Record<string, string> = {
  pickpocketing: 'badge-pickpocketing',
  bag_snatching: 'badge-bag-snatching',
  theft_from_vehicle: 'badge-theft-from-vehicle',
  other: 'badge-other',
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
}: {
  incident: IncidentRow;
  userEmail?: string;
}): string {
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
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// NotFoundPage  (reusable 404 shell for incidents)
// ---------------------------------------------------------------------------

export function IncidentNotFoundPage({ userEmail }: { userEmail?: string }): string {
  return (
    <InnerPage title="Incident not found | CrimeLens" userEmail={userEmail}>
      <h2>Incident not found</h2>
      <p>This incident may have been removed or the link is incorrect.</p>
    </InnerPage>
  );
}
