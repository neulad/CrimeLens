/**
 * map.js — the single JS island for CrimeLens.
 *
 * Responsibilities:
 *  1. Initialize a Leaflet map centered on Europe.
 *  2. Fetch /api/incidents for the current viewport + filter state.
 *  3. Render clustered markers, open the detail panel on click.
 *  4. Re-fetch when filter bar inputs change.
 *  5. Sync filter state to the URL (pushState).
 *  6. Report-incident mode: "📍 Report incident" → crosshair → click → form.
 */

(() => {
  // ── Constants ─────────────────────────────────────────────────────────────

  const EUROPE_CENTER = [48.5, 10.0];
  const EUROPE_ZOOM = 5;
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTR =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Crime-type → fill colour (matches CSS badge tokens)
  const TYPE_COLOR = {
    pickpocketing: '#d97706',
    bag_snatching: '#dc2626',
    theft_from_vehicle: '#2563eb',
    other: '#9ca3af',
  };

  const CITIES = ['Amsterdam', 'Barcelona', 'Paris', 'Prague', 'Rome'];

  // ── Map init ──────────────────────────────────────────────────────────────

  const map = L.map('map', {
    center: EUROPE_CENTER,
    zoom: EUROPE_ZOOM,
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
      iconSize: [18, 24],
      iconAnchor: [9, 24],
      popupAnchor: [0, -24],
    });
  }

  function tempPinIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 24" width="18" height="24">
      <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15C18 4.03 13.97 0 9 0z"
            fill="#dc2626" stroke="#fff" stroke-width="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"/>
      <circle cx="9" cy="9" r="4" fill="rgba(255,255,255,0.7)"/>
    </svg>`;
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [18, 24],
      iconAnchor: [9, 24],
    });
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  let fetchController = null;

  function getFilterParams() {
    const form = document.querySelector('.filter-form');
    if (!form) return new URLSearchParams();

    const checked = [...form.querySelectorAll('input[type=checkbox]:checked')].map(
      (el) => el.value,
    );
    const since = form.querySelector('select[name=since]')?.value ?? 'all';

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

      const res = await fetch(`/api/incidents?${params.toString()}`, {
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

    for (const item of items) {
      const marker = L.marker([item.lat, item.lng], { icon: pinIcon(item.crimeType) });
      marker.on('click', () => {
        openDetailPanel(item);
      });
      clusterGroup.addLayer(marker);
    }
  }

  // ── Detail panel ──────────────────────────────────────────────────────────

  const panel = document.getElementById('detail-panel');
  const panelContent = document.getElementById('detail-content');
  const panelClose = document.getElementById('detail-close');

  /** Escape a string for safe DOM text insertion. */
  function esc(str) {
    const d = document.createElement('span');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function openDetailPanel(item) {
    if (!panel || !panelContent) return;

    const date = new Date(item.occurredAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const crimeLabel =
      {
        pickpocketing: 'Pickpocketing',
        bag_snatching: 'Bag snatching',
        theft_from_vehicle: 'Vehicle theft',
        other: 'Other',
      }[item.crimeType] ?? item.crimeType;

    const sourceLabel = item.source === 'SEEDED' ? 'Seeded dataset' : 'User report';
    const CRIME_BADGE = {
      pickpocketing: 'badge-pickpocketing',
      bag_snatching: 'badge-bag-snatching',
      theft_from_vehicle: 'badge-theft-from-vehicle',
      other: 'badge-other',
    };
    const SOURCE_BADGE = { SEEDED: 'badge-seeded', USER_REPORTED: 'badge-user' };
    const badgeClass = `badge ${CRIME_BADGE[item.crimeType] ?? 'badge-other'}`;
    const srcClass = `badge ${SOURCE_BADGE[item.source] ?? 'badge-other'}`;
    const crimeLabelSafe = esc(crimeLabel);

    panelContent.innerHTML = `
      <span class="${badgeClass}" aria-label="Crime type: ${crimeLabelSafe}">${crimeLabelSafe.toUpperCase()}</span>
      <span class="${srcClass}" aria-label="Source: ${esc(sourceLabel)}">${esc(sourceLabel).toUpperCase()}</span>
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

  if (panelClose) panelClose.addEventListener('click', () => {
    cancelReportMode();
    closeDetailPanel();
  });

  // ── Report incident mode ──────────────────────────────────────────────────

  const reportBtn = document.getElementById('report-btn');
  const mapContainer = document.getElementById('map-container');
  let reportingMode = false;
  let tempMarker = null;

  function enterReportMode() {
    reportingMode = true;
    if (reportBtn) {
      reportBtn.textContent = '✕ Cancel';
      reportBtn.classList.add('report-btn--active');
    }
    if (mapContainer) mapContainer.classList.add('report-placing');
    // Show instruction in panel
    if (panel && panelContent) {
      panelContent.innerHTML = `
        <p style="font-size:0.85rem;color:#374151;margin-top:0.5rem">
          <strong>Click anywhere on the map</strong> to drop a pin for the incident location.
        </p>
      `;
      panel.classList.remove('detail-panel--closed');
      panel.classList.add('detail-panel--open');
      panel.removeAttribute('aria-hidden');
    }
  }

  function cancelReportMode() {
    if (!reportingMode) return;
    reportingMode = false;
    if (reportBtn) {
      reportBtn.textContent = '📍 Report incident';
      reportBtn.classList.remove('report-btn--active');
    }
    if (mapContainer) mapContainer.classList.remove('report-placing');
    if (tempMarker) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }
  }

  function showReportForm(lat, lng) {
    if (!panel || !panelContent) return;

    const cityOptions = CITIES.map(
      (c) => `<option value="${c}">${c}</option>`
    ).join('');

    // Default date = today in local time (YYYY-MM-DD)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    panelContent.innerHTML = `
      <h4 style="margin:0 0 0.75rem;font-size:0.95rem">Report an incident</h4>
      <p style="font-size:0.75rem;color:#6b7280;margin:0 0 0.75rem">
        📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
      </p>
      <form class="report-form" id="report-incident-form">
        <label>
          Crime type
          <select name="crimeType" required>
            <option value="pickpocketing">Pickpocketing</option>
            <option value="bag_snatching">Bag snatching</option>
            <option value="theft_from_vehicle">Vehicle theft</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          City
          <select name="city" required>
            ${cityOptions}
          </select>
        </label>
        <label>
          Date of incident
          <input type="date" name="occurredAt" required value="${todayStr}" max="${todayStr}" />
        </label>
        <label>
          Description
          <textarea name="description" required placeholder="Briefly describe what happened…" maxlength="1000"></textarea>
        </label>
        <div class="report-form__actions">
          <button type="button" id="report-cancel-btn" class="outline secondary">Cancel</button>
          <button type="submit" class="contrast">Submit</button>
        </div>
        <div id="report-form-error" class="report-form__error" style="display:none"></div>
      </form>
    `;

    document.getElementById('report-cancel-btn')?.addEventListener('click', () => {
      cancelReportMode();
      closeDetailPanel();
    });

    document.getElementById('report-incident-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('[type=submit]');
      const errorDiv = document.getElementById('report-form-error');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      if (errorDiv) errorDiv.style.display = 'none';

      const body = {
        lat,
        lng,
        crimeType: form.crimeType.value,
        city: form.city.value,
        occurredAt: form.occurredAt.value,
        description: form.description.value,
      };

      try {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          if (errorDiv) {
            errorDiv.textContent = data.message ?? 'Something went wrong.';
            errorDiv.style.display = 'block';
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
          return;
        }

        // Success — exit report mode, reload markers, open the new pin's detail
        cancelReportMode();
        await loadIncidents();
        closeDetailPanel();

        // Brief success notice
        if (panelContent && panel) {
          panelContent.innerHTML = `
            <p style="color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.375rem;padding:0.6rem 0.75rem;font-size:0.875rem;margin:0">
              ✅ Incident reported! It will appear on the map shortly.
            </p>
            <p style="margin-top:0.75rem;font-size:0.85rem">
              <a href="/incidents/${esc(data.id)}">View your report →</a>
            </p>
          `;
          panel.classList.remove('detail-panel--closed');
          panel.classList.add('detail-panel--open');
          panel.removeAttribute('aria-hidden');
        }
      } catch (err) {
        console.error('Failed to submit incident:', err);
        if (errorDiv) {
          errorDiv.textContent = 'Network error. Please try again.';
          errorDiv.style.display = 'block';
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  }

  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      if (reportingMode) {
        cancelReportMode();
        closeDetailPanel();
      } else {
        enterReportMode();
      }
    });
  }

  // Map click: place pin (report mode) or close panel (normal mode)
  map.on('click', (e) => {
    if (!reportingMode) {
      closeDetailPanel();
      return;
    }

    const { lat, lng } = e.latlng;

    // Remove existing temp marker if re-clicking
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker([lat, lng], { icon: tempPinIcon(), zIndexOffset: 1000 }).addTo(map);

    // Exit crosshair mode but keep reportingMode so cancel still works
    if (mapContainer) mapContainer.classList.remove('report-placing');

    showReportForm(lat, lng);
  });

  // ── Filter bar wiring ─────────────────────────────────────────────────────

  const filterForm = document.querySelector('.filter-form');
  if (filterForm) {
    filterForm.addEventListener('change', () => {
      loadIncidents();
    });
  }

  // Re-fetch on map move (debounced)
  let moveTimer = null;
  map.on('moveend', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(loadIncidents, 300);
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  map.whenReady(() => {
    loadIncidents();
  });
})();
