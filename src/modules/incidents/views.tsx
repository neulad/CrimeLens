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
      <hgroup>
        <h2 safe>{crimeLabel}</h2>
        <p safe>{incident.city}</p>
      </hgroup>

      <p>
        <span class={badgeClass} safe>
          {crimeLabel.toUpperCase()}
        </span>{' '}
        <span class={srcClass} safe>
          {sourceLabel.toUpperCase()}
        </span>
      </p>

      <hr />

      <dl>
        <dt>Date &amp; time</dt>
        <dd safe>
          {date}, {time}
        </dd>

        <dt>City</dt>
        <dd safe>{incident.city}</dd>

        <dt>Description</dt>
        <dd safe>{incident.description}</dd>

        <dt>Coordinates</dt>
        <dd>
          <a href={osmUrl} target="_blank" rel="noopener noreferrer">
            {lat}, {lng} ↗
          </a>
        </dd>

        <dt>Source</dt>
        <dd safe>{sourceLabel}</dd>

        <dt>Incident ID</dt>
        <dd>
          <code safe>{incident.id}</code>
        </dd>
      </dl>
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
