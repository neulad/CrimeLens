/**
 * map.js v14 — CrimeLens map island.
 *
 * Responsibilities:
 *  1. Initialise a full-screen Leaflet map.
 *  2. Fetch /api/incidents for the current viewport + filter state.
 *  3. Render clustered markers; open the detail panel on click.
 *  4. Re-fetch when filter bar inputs / time-period select change.
 *  5. Sync filter state to the URL (pushState).
 *  6. Report-incident mode: map click → form in detail panel.
 *  7. City search: geocode input → pan map, default to user's current city.
 *  8. WebSocket /ws/incidents: live incident feed in the sidebar.
 */

(() => {
  // ── Constants ─────────────────────────────────────────────────────────────

  const EUROPE_CENTER = [48.5, 10.0];
  const EUROPE_ZOOM = 5;
  const TILE_URL =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  const TILE_ATTR = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';

  const TYPE_COLOR = {
    pickpocketing: '#d97706',
    bag_snatching: '#dc2626',
    theft_from_vehicle: '#2563eb',
    other: '#9ca3af',
  };

  const TYPE_LABEL = {
    pickpocketing: 'Pickpocketing',
    bag_snatching: 'Bag snatching',
    theft_from_vehicle: 'Vehicle theft',
    other: 'Other',
  };

  const BADGE_CLASS = {
    pickpocketing: 'badge-pickpocketing',
    bag_snatching: 'badge-bag-snatching',
    theft_from_vehicle: 'badge-theft-from-vehicle',
    other: 'badge-other',
  };

  // ── Map init ──────────────────────────────────────────────────────────────

  const map = L.map('map', {
    center: EUROPE_CENTER,
    zoom: EUROPE_ZOOM,
    zoomControl: false,
  });
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
  map.attributionControl.setPrefix(false);

  const CLUSTER_COLOR = { s: '#2d3f6b', m: '#b45309', l: '#b91c1c' };

  // Canvas-based cluster icon — avoids SVG-in-img rendering quirks (squished height)
  // that affect both L.divIcon (div container) and L.Icon (img src=svg data URL).
  // Canvas produces a raster PNG with exact pixel dimensions; CSS cannot distort it.
  const _dpr = window.devicePixelRatio || 1;

  function buildClusterIcon(count) {
    const size = count < 10 ? 32 : count < 100 ? 38 : 46;
    const color = count < 10 ? CLUSTER_COLOR.s : count < 100 ? CLUSTER_COLOR.m : CLUSTER_COLOR.l;
    const r = size / 2;
    const fs = size < 38 ? 11 : 13;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size * _dpr);
    canvas.height = Math.round(size * _dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(_dpr, _dpr);

    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(count), r, r);

    return new L.Icon({
      iconUrl: canvas.toDataURL(),
      iconSize: [size, size],
      iconAnchor: [r, r],
    });
  }

  const clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
    disableClusteringAtZoom: 15,
    iconCreateFunction(cluster) {
      return buildClusterIcon(cluster.getChildCount());
    },
  });
  map.addLayer(clusterGroup);

  // Invalidate Leaflet size after sidebar renders (sidebar eats right portion)
  setTimeout(() => map.invalidateSize(), 100);

  // ── Marker icon factory ───────────────────────────────────────────────────
  // Inner div uses position:absolute;inset:0 so it always fills the Leaflet
  // container exactly — immune to any .marker-cluster div height overrides.

  function pinMarker(lat, lng, crimeType) {
    return L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: TYPE_COLOR[crimeType] ?? TYPE_COLOR.other,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.92,
      interactive: true,
    });
  }

  function tempPinIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 24" width="18" height="24">
      <path d="M9 0C4.03 0 0 4.03 0 9c0 6.75 9 15 9 15s9-8.25 9-15C18 4.03 13.97 0 9 0z" fill="#dc2626"/>
      <circle cx="9" cy="9" r="4" fill="rgba(255,255,255,0.7)"/>
    </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [18, 24], iconAnchor: [9, 24] });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function esc(str) {
    const d = document.createElement('span');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function timeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  let fetchController = null;

  function getFilterParams() {
    const form = document.querySelector('#filter-form');
    const checked = form
      ? [...form.querySelectorAll('input[type=checkbox]:checked')].map((el) => el.value)
      : [];
    const since = document.getElementById('since-select')?.value ?? 'all';
    const params = new URLSearchParams();
    if (checked.length) params.set('types', checked.join(','));
    params.set('since', since);
    return params;
  }

  function getBboxParam() {
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
      .map((n) => n.toFixed(6))
      .join(',');
  }

  async function loadIncidents() {
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();

    const loading = document.getElementById('map-loading');
    if (loading) loading.classList.add('is-loading');

    try {
      const params = getFilterParams();
      params.set('bbox', getBboxParam());

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
      if (loading) loading.classList.remove('is-loading');
    }
  }

  // ── Marker rendering ──────────────────────────────────────────────────────

  function renderMarkers(items) {
    clusterGroup.clearLayers();
    for (const item of items) {
      const m = pinMarker(item.lat, item.lng, item.crimeType);
      m.on('click', (e) => { L.DomEvent.stopPropagation(e); openDetailPanel(item); });
      clusterGroup.addLayer(m);
    }
  }

  // ── Detail panel ──────────────────────────────────────────────────────────

  const panel = document.getElementById('detail-panel');
  const panelContent = document.getElementById('detail-content');
  const panelClose = document.getElementById('detail-close');

  function openDetailPanel(item) {
    if (!panel || !panelContent) return;

    const date = new Date(item.occurredAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const crimeLabel = TYPE_LABEL[item.crimeType] ?? item.crimeType;
    const sourceLabel = item.source === 'SEEDED' ? 'Seeded dataset' : 'User report';
    const badgeClass = `badge ${BADGE_CLASS[item.crimeType] ?? 'badge-other'}`;
    const srcClass = `badge ${item.source === 'SEEDED' ? 'badge-seeded' : 'badge-user'}`;

    panelContent.innerHTML = `
      <span class="${badgeClass}">${esc(crimeLabel).toUpperCase()}</span>
      <span class="${srcClass}">${esc(sourceLabel).toUpperCase()}</span>
      <p style="margin-top:0.75rem;font-size:0.8rem;color:var(--pico-secondary)">
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

  if (panelClose) {
    panelClose.addEventListener('click', () => {
      cancelReportMode();
      closeDetailPanel();
    });
  }

  // ── User location ─────────────────────────────────────────────────────────

  let userLat = null;
  let userLng = null;
  let userLocationLayer = null;

  function showUserLocation(lat, lng) {
    if (userLocationLayer) map.removeLayer(userLocationLayer);
    userLocationLayer = L.layerGroup([
      // Pulse ring (animated via CSS on the SVG circle)
      L.circleMarker([lat, lng], {
        radius: 9, className: 'user-pulse-ring',
        fillColor: 'transparent', color: '#1d4ed8',
        weight: 2, fillOpacity: 0, interactive: false,
      }),
      // Solid blue dot
      L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#1d4ed8', color: '#fff',
        weight: 3, fillOpacity: 1, interactive: false,
      }),
    ]).addTo(map);
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        showUserLocation(userLat, userLng);
        map.setView([userLat, userLng], 13);
        reverseGeocode(userLat, userLng).then((city) => {
          if (city) setCity(city);
        });
      },
      null,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // ── Geocoding ─────────────────────────────────────────────────────────────

  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'CrimeLens/1.0' } });
      if (!res.ok) return null;
      const data = await res.json();
      const a = data.address ?? {};
      // Only return proper cities — skip towns/villages/suburbs so that
      // panning over a Paris suburb like Pantin doesn't replace "Paris"
      return a.city ?? null;
    } catch {
      return null;
    }
  }

  async function searchCities(query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&featuretype=city`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'CrimeLens/1.0' } });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  // ── Active city state ─────────────────────────────────────────────────────

  let activeCity = null;
  let suppressMoveUpdate = false;

  async function loadFeed(cityName) {
    if (!cityName) return;
    const params = getFilterParams();
    params.set('city', cityName);
    try {
      const res = await fetch(`/api/incidents/feed?${params.toString()}`);
      if (!res.ok) return;
      const { items } = await res.json();
      populateFeed(items ?? [], cityName);
    } catch { /* silent */ }
  }

  function setCity(name) {
    const input = document.getElementById('city-search');
    if (input) input.value = name;
    activeCity = name;
    loadFeed(name);
  }

  // ── City search with autocomplete ─────────────────────────────────────────

  const citySearch = document.getElementById('city-search');
  const searchDropdown = document.getElementById('city-search-dropdown');
  let searchTimer = null;

  function showDropdown(results) {
    if (!searchDropdown) return;
    if (!results.length) { hideDropdown(); return; }

    searchDropdown.innerHTML = '';
    for (const r of results) {
      const item = document.createElement('div');
      item.className = 'search-suggestion';
      item.textContent = r.display_name;
      item.addEventListener('mousedown', (evt) => {
        evt.preventDefault();
        hideDropdown();
        const name = r.display_name.split(',')[0].trim();
        // Nominatim boundingbox: [south, north, west, east]
        const [s, n, w, east] = (r.boundingbox ?? []).map(parseFloat);
        const bbox = [w, s, east, n];
        suppressMoveUpdate = true;
        map.setView([parseFloat(r.lat), parseFloat(r.lon)], 13);
        setTimeout(() => { suppressMoveUpdate = false; }, 2000);
        setCity(name);
      });
      searchDropdown.appendChild(item);
    }
    searchDropdown.classList.add('search-dropdown--open');
  }

  function hideDropdown() {
    if (searchDropdown) searchDropdown.classList.remove('search-dropdown--open');
  }

  if (citySearch) {
    citySearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = citySearch.value.trim();
      if (q.length < 2) { hideDropdown(); return; }
      searchTimer = setTimeout(async () => {
        const results = await searchCities(q);
        showDropdown(results);
      }, 350);
    });

    citySearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hideDropdown(); citySearch.blur(); }
    });

    citySearch.addEventListener('blur', () => {
      setTimeout(hideDropdown, 150);
    });
  }

  // ── Live incident feed (WebSocket) ────────────────────────────────────────

  const feed = document.getElementById('incident-feed');

  function feedBadgeClass(crimeType) {
    const colors = {
      pickpocketing: 'background:var(--badge-pickpocketing-bg);color:var(--badge-pickpocketing-fg)',
      bag_snatching: 'background:var(--badge-bag-bg);color:var(--badge-bag-fg)',
      theft_from_vehicle: 'background:var(--badge-vehicle-bg);color:var(--badge-vehicle-fg)',
      other: 'background:var(--badge-other-bg);color:var(--badge-other-fg)',
    };
    return colors[crimeType] ?? colors.other;
  }

  function createFeedItem(incident, isNew = false) {
    const item = document.createElement('div');
    item.className = `feed-item${isNew ? ' feed-item--new' : ''}`;
    item.dataset.lat = incident.lat;
    item.dataset.lng = incident.lng;
    item.dataset.id = incident.id;

    const label = TYPE_LABEL[incident.crimeType] ?? incident.crimeType;
    const badgeStyle = feedBadgeClass(incident.crimeType);
    const when = timeAgo(incident.occurredAt);
    const descSnippet = (incident.description ?? '').slice(0, 80);

    item.innerHTML = `
      <div class="feed-item__top">
        <span class="feed-item__badge" style="${badgeStyle}">${esc(label)}</span>
        <span class="feed-item__city">${esc(incident.city)}</span>
        <span class="feed-item__time">${esc(when)}</span>
      </div>
      <div class="feed-item__desc">${esc(descSnippet)}</div>
    `;

    item.addEventListener('click', () => {
      map.setView([parseFloat(item.dataset.lat), parseFloat(item.dataset.lng)], 14);
      openDetailPanel(incident);
    });

    return item;
  }

  function prependFeedItem(incident) {
    if (!feed) return;
    const empty = feed.querySelector('.incident-feed__empty');
    if (empty) empty.remove();

    const item = createFeedItem(incident, true);
    feed.insertBefore(item, feed.firstChild);

    // Keep feed at most 50 items
    while (feed.children.length > 50) {
      feed.removeChild(feed.lastChild);
    }
  }

  function populateFeed(items, cityName) {
    if (!feed) return;
    feed.innerHTML = '';
    if (!items.length) {
      const label = cityName ? `No incidents reported in ${cityName}.` : 'No incidents found.';
      feed.innerHTML = `<div class="incident-feed__empty">${label}</div>`;
      return;
    }
    for (const item of items) {
      feed.appendChild(createFeedItem(item, false));
    }
  }

  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws/incidents`);

    ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      // Only handle live new incidents from other users; feed content is viewport-driven
      if (msg.type === 'new_incident') {
        // Add to map markers if it falls within the current view
        const inc = msg.incident;
        if (map.getBounds().contains([inc.lat, inc.lng])) {
          const m = pinMarker(inc.lat, inc.lng, inc.crimeType);
          m.on('click', (e) => { L.DomEvent.stopPropagation(e); openDetailPanel(inc); });
          clusterGroup.addLayer(m);
          prependFeedItem(inc);
        }
      }
    });

    ws.addEventListener('close', () => {
      // Reconnect after 3 s
      setTimeout(connectWebSocket, 3000);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  connectWebSocket();

  // ── Report incident mode ──────────────────────────────────────────────────

  const reportBtn = document.getElementById('report-btn');
  const mapContainer = document.getElementById('map-container');
  let reportingMode = false;
  let tempMarker = null;

  function enterReportMode() {
    reportingMode = true;
    if (reportBtn) {
      reportBtn.textContent = '✕ Cancel';
      reportBtn.style.background = '#dc2626';
    }
    if (userLat !== null && userLng !== null) {
      if (mapContainer) mapContainer.classList.remove('report-placing');
      if (tempMarker) map.removeLayer(tempMarker);
      tempMarker = L.marker([userLat, userLng], { icon: tempPinIcon(), zIndexOffset: 1000 }).addTo(map);
      showReportForm(userLat, userLng);
    } else {
      if (mapContainer) mapContainer.classList.add('report-placing');
      if (panel && panelContent) {
        panelContent.innerHTML = `
          <p style="font-size:0.85rem;color:#374151;margin-top:0.5rem">
            <strong>Click anywhere on the map</strong> to drop a pin for the incident location.
          </p>
          <p style="font-size:0.75rem;color:#9ca3af;margin-top:0.25rem">
            (Allow location access for automatic placement.)
          </p>
        `;
        panel.classList.remove('detail-panel--closed');
        panel.classList.add('detail-panel--open');
        panel.removeAttribute('aria-hidden');
      }
    }
  }

  function cancelReportMode() {
    if (!reportingMode) return;
    reportingMode = false;
    if (reportBtn) {
      reportBtn.textContent = 'Report Incident';
      reportBtn.style.background = '';
    }
    if (mapContainer) mapContainer.classList.remove('report-placing');
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
  }

  function showReportForm(lat, lng) {
    if (!panel || !panelContent) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    panel.classList.remove('detail-panel--closed');
    panel.classList.add('detail-panel--open');
    panel.removeAttribute('aria-hidden');

    panelContent.innerHTML = `
      <h4 style="margin:0 0 0.75rem;font-size:0.95rem">Report an incident</h4>
      <p style="font-size:0.75rem;color:#6b7280;margin:0 0 0.5rem">
        📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
      </p>
      <p id="report-city-display" style="font-size:0.8rem;color:#374151;margin:0 0 0.75rem">
        Detecting location…
      </p>
      <form class="report-form" id="report-incident-form">
        <input type="hidden" name="city" id="report-city-value" value="" />
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

    reverseGeocode(lat, lng).then((city) => {
      const cityDisplay = document.getElementById('report-city-display');
      const cityInput = document.getElementById('report-city-value');
      if (!cityDisplay || !cityInput) return;
      cityDisplay.textContent = city ? `📍 ${city}` : '📍 Location unknown';
      cityInput.value = city ?? 'Unknown';
    });

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
        city: form.city.value || 'Unknown',
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
          if (errorDiv) { errorDiv.textContent = data.message ?? 'Something went wrong.'; errorDiv.style.display = 'block'; }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
          return;
        }

        cancelReportMode();
        await loadIncidents();
        closeDetailPanel();

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
        if (errorDiv) { errorDiv.textContent = 'Network error. Please try again.'; errorDiv.style.display = 'block'; }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  }

  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      if (reportingMode) { cancelReportMode(); closeDetailPanel(); }
      else { enterReportMode(); }
    });
  }

  map.on('click', (e) => {
    if (!reportingMode) { closeDetailPanel(); return; }
    const { lat, lng } = e.latlng;
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker([lat, lng], { icon: tempPinIcon(), zIndexOffset: 1000 }).addTo(map);
    if (mapContainer) mapContainer.classList.remove('report-placing');
    showReportForm(lat, lng);
  });

  // ── Filter wiring ─────────────────────────────────────────────────────────

  const filterForm = document.querySelector('#filter-form');
  if (filterForm) {
    filterForm.addEventListener('change', () => {
      loadIncidents();
      if (activeCity) loadFeed(activeCity);
    });
  }

  const sinceSelect = document.getElementById('since-select');
  if (sinceSelect) {
    sinceSelect.addEventListener('change', () => {
      loadIncidents();
      if (activeCity) loadFeed(activeCity);
    });
  }

  let moveTimer = null;
  let cityLabelTimer = null;

  map.on('moveend', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(loadIncidents, 300);

    // Update search bar + feed when zoomed into city level
    if (map.getZoom() >= 10 && !suppressMoveUpdate) {
      clearTimeout(cityLabelTimer);
      cityLabelTimer = setTimeout(() => {
        if (document.activeElement === citySearch) return;
        const { lat, lng } = map.getCenter();
        reverseGeocode(lat, lng).then((city) => { if (city) setCity(city); });
      }, 100);
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  map.whenReady(() => {
    loadIncidents();
  });
})();
