/**
 * map.js — the single JS island for CrimeLens.
 *
 * Responsibilities:
 *  1. Initialize a Leaflet map centered on Europe.
 *  2. Fetch /api/incidents for the current viewport + filter state.
 *  3. Render clustered markers, open the detail panel on click.
 *  4. Re-fetch when filter bar inputs change.
 *  5. Sync filter state to the URL (pushState).
 *
 * Weeks 6-8 will flesh this out fully. For Week 4 (scaffold), this file
 * bootstraps the map and proves that Leaflet loads and renders.
 */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  const EUROPE_CENTER = [48.5, 10.0];
  const EUROPE_ZOOM   = 5;
  const TILE_URL      = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTR     = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Crime-type → fill colour (matches CSS badge tokens)
  const TYPE_COLOR = {
    pickpocketing:      '#d97706',
    bag_snatching:      '#dc2626',
    theft_from_vehicle: '#2563eb',
    other:              '#9ca3af',
  };

  // ── Map init ──────────────────────────────────────────────────────────────

  const map = L.map('map', {
    center: EUROPE_CENTER,
    zoom:   EUROPE_ZOOM,
    zoomControl: true,
  });

  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

  // Marker cluster group
  const clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
  });
  map.addLayer(clusterGroup);

  // ── Marker icon factory ───────────────────────────────────────────────────

  function pinIcon(crimeType) {
    const fill = TYPE_COLOR[crimeType] ?? TYPE_COLOR.other;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 24" width="18" height="24">
      <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15C18 4.03 13.97 0 9 0z"
            fill="${fill}" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.25))"/>
      <circle cx="9" cy="9" r="4" fill="rgba(255,255,255,0.5)"/>
    </svg>`;

    return L.divIcon({
      html: svg,
      className: '',
      iconSize:   [18, 24],
      iconAnchor: [9, 24],
      popupAnchor:[0, -24],
    });
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  let fetchController = null;

  function getFilterParams() {
    const form    = document.querySelector('.filter-form');
    if (!form) return new URLSearchParams();

    const checked = [...form.querySelectorAll('input[type=checkbox]:checked')]
      .map(el => el.value);
    const since   = form.querySelector('select[name=since]')?.value ?? 'all';

    const params = new URLSearchParams();
    if (checked.length) params.set('types', checked.join(','));
    params.set('since', since);
    return params;
  }

  function getBboxParam() {
    const b = map.getBounds();
    return [
      b.getWest().toFixed(6),
      b.getSouth().toFixed(6),
      b.getEast().toFixed(6),
      b.getNorth().toFixed(6),
    ].join(',');
  }

  async function loadIncidents() {
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();

    const loading = document.getElementById('map-loading');
    if (loading) loading.classList.add('htmx-request');

    try {
      const params = getFilterParams();
      params.set('bbox', getBboxParam());

      // Push filter state to URL for shareability
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, '', url);

      const res = await fetch('/api/incidents?' + params.toString(), {
        signal: fetchController.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { items } = await res.json();
      renderMarkers(items ?? []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load incidents:', err);
    } finally {
      if (loading) loading.classList.remove('htmx-request');
    }
  }

  // ── Marker rendering ──────────────────────────────────────────────────────

  function renderMarkers(items) {
    clusterGroup.clearLayers();

    items.forEach(function (item) {
      const marker = L.marker([item.lat, item.lng], { icon: pinIcon(item.crimeType) });
      marker.on('click', function () { openDetailPanel(item); });
      clusterGroup.addLayer(marker);
    });
  }

  // ── Detail panel ──────────────────────────────────────────────────────────

  const panel        = document.getElementById('detail-panel');
  const panelContent = document.getElementById('detail-content');
  const panelClose   = document.getElementById('detail-close');

  /** Escape a string for safe DOM text insertion. */
  function esc(str) {
    const d = document.createElement('span');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function openDetailPanel(item) {
    if (!panel || !panelContent) return;

    const date = new Date(item.occurredAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    const crimeLabel = {
      pickpocketing:      'Pickpocketing',
      bag_snatching:      'Bag snatching',
      theft_from_vehicle: 'Vehicle theft',
      other:              'Other',
    }[item.crimeType] ?? item.crimeType;

    const sourceLabel = item.source === 'SEEDED' ? 'Seeded dataset' : 'User report';
    // crimeType and source are validated by DB CHECK constraints — safe for class names.
    const badgeClass  = 'badge badge-' + item.crimeType.replace('_', '-');
    const srcClass    = 'badge badge-' + item.source.toLowerCase().replace('_', '-');

    // Use esc() for any field that comes from user-supplied or seed data.
    panelContent.innerHTML = `
      <span class="${badgeClass}" aria-label="Crime type: ${crimeLabel}">${crimeLabel.toUpperCase()}</span>
      <span class="${srcClass}" aria-label="Source: ${sourceLabel}">${sourceLabel.toUpperCase()}</span>
      <p style="margin-top:0.75rem; font-size:0.8rem; color:var(--pico-secondary)">
        ${esc(date)}<br>${esc(item.city)}
      </p>
      <p>${esc(item.description)}</p>
      <a href="/incidents/${esc(item.id)}">View full details →</a>
    `;

    panel.classList.remove('detail-panel--closed');
    panel.classList.add('detail-panel--open');
    panel.removeAttribute('aria-hidden');
  }

  function closeDetailPanel() {
    if (!panel) return;
    panel.classList.add('detail-panel--closed');
    panel.classList.remove('detail-panel--open');
    panel.setAttribute('aria-hidden', 'true');
  }

  if (panelClose) panelClose.addEventListener('click', closeDetailPanel);

  // Close panel on map click
  map.on('click', closeDetailPanel);

  // ── Filter bar wiring ─────────────────────────────────────────────────────

  const filterForm = document.querySelector('.filter-form');
  if (filterForm) {
    filterForm.addEventListener('change', function () {
      loadIncidents();
    });
  }

  // Re-fetch on map move (debounced)
  let moveTimer = null;
  map.on('moveend', function () {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(loadIncidents, 300);
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  // Initial load — deferred until tiles have settled
  map.whenReady(function () {
    loadIncidents();
  });
})();
