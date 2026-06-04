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
    pickpocketing:  '#d97706',
    bicycle_stolen: '#2563eb',
    street_fight:   '#dc2626',
    robbery:        '#9a3412',
    street_scams:   '#7c3aed',
  };

  const TYPE_LABEL = {
    pickpocketing:  'Pickpocketing',
    bicycle_stolen: 'Bicycle stolen',
    street_fight:   'Street fight',
    robbery:        'Robbery',
    street_scams:   'Street scam',
  };

  const BADGE_CLASS = {
    pickpocketing:  'badge-pickpocketing',
    bicycle_stolen: 'badge-bicycle-stolen',
    street_fight:   'badge-street-fight',
    robbery:        'badge-robbery',
    street_scams:   'badge-street-scams',
  };

  // ── Map init ──────────────────────────────────────────────────────────────

  const map = L.map('map', {
    center: EUROPE_CENTER,
    zoom: EUROPE_ZOOM,
    zoomControl: false,
  });
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
  map.attributionControl.setPrefix(false);

  const clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
    disableClusteringAtZoom: 15,
  });
  map.addLayer(clusterGroup);

  // Invalidate Leaflet size after sidebar renders (sidebar eats right portion)
  setTimeout(() => map.invalidateSize(), 100);

  // ── Marker icon factory ───────────────────────────────────────────────────
  // Crime-type pin icons use Tabler Icons paths (MIT licence).
  // Each icon is a 24×24 stroke-based SVG embedded in a teardrop pin shape.

  // Per-type SVG group transform — nudge icons that aren't visually centred on the 24×24 grid.
  const TYPE_ICON_TRANSFORM = {
    // hand-stop paths span x:8–20 (visual centre ~14 vs grid centre 12) → shift left 2px
    pickpocketing: 'translate(2,4)',
  };

  // Tabler Icons paths (MIT licence), 24×24 stroke-based viewBox.
  const TYPE_ICON_PATHS = {
    // hand-stop — fingers raised, wallet being grabbed
    pickpocketing: `
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V13"/>
      <path d="M11 6.5V4a1.5 1.5 0 0 1 3 0v9"/>
      <path d="M14 6a1.5 1.5 0 0 1 3 0v6"/>
      <path d="M17 8a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-12 0v-3a1.5 1.5 0 0 1 3 0"/>`,
    // bicycle — two wheels + frame
    bicycle_stolen: `
      <path d="M5 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>
      <path d="M19 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>
      <path d="M7 18l3.5-7h5l3.5 7"/>
      <path d="M10.5 11l1.5-4h3.5"/>
      <path d="M11.5 7h4.5"/>`,
    // sword — blade diagonal + guard + grip
    street_fight: `
      <path d="M5 21l9-9"/>
      <path d="M14.5 10.5l.5-7.5-7.5.5 2.5 2.5-5 5 3.5 3.5 5-5z"/>
      <path d="M3.5 21.5l1-1"/>`,
    // knife — curved blade + handle
    robbery: `
      <path d="M14 10l-8.5 8.5a2.5 2.5 0 0 0 3.5 3.5L17.5 13C21 9.5 21 5 19 3s-6.5-2-10 1.5"/>
      <path d="M3.5 20.5l1.5-1.5"/>`,
    // masks-theater — comedy + tragedy masks
    street_scams: `
      <path d="M13 9c0-2 1.5-3.5 3.5-3.5S20 7 20 9c0 3.5-2.5 5-3.5 6.5"/>
      <path d="M4 9c0-2 1.5-3.5 3.5-3.5S11 7 11 9c0 3.5-2.5 5-3.5 6.5"/>
      <path d="M7.5 21c1.5 0 2.5-.75 3.5-2 1 1.25 2 2 3.5 2"/>
      <path d="M6 13h.01"/>
      <path d="M18 13h.01"/>`,
  };

  function crimeIcon(crimeType) {
    const color = TYPE_COLOR[crimeType] ?? TYPE_COLOR.other;
    const paths = TYPE_ICON_PATHS[crimeType] ?? TYPE_ICON_PATHS.other;
    const transform = TYPE_ICON_TRANSFORM[crimeType] ?? 'translate(4,4)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16 0 27 16 40 16 40S32 27 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
      <g transform="${transform}" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        ${paths}
      </g>
    </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });
  }

  function pinMarker(lat, lng, crimeType) {
    return L.marker([lat, lng], { icon: crimeIcon(crimeType) });
  }

  // Temp (draft) pin — same teardrop as crime pins but outlined/hollow so it reads as
  // "not yet submitted". Uses the same 32×40 size so it feels consistent on the map.
  function tempPinIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16 0 27 16 40 16 40S32 27 32 16C32 7.163 24.837 0 16 0Z"
            fill="white" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="4 3"/>
      <circle cx="16" cy="16" r="5" fill="none" stroke="#dc2626" stroke-width="2"/>
      <line x1="16" y1="12" x2="16" y2="20" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="16" x2="20" y2="16" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });
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

  const currentUserId = document.getElementById('map-container')?.dataset?.userId ?? '';

  function openDetailPanel(item) {
    if (!panel || !panelContent) return;

    const date = new Date(item.occurredAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const crimeLabel = TYPE_LABEL[item.crimeType] ?? item.crimeType;
    const sourceLabel = item.source === 'SEEDED' ? 'Seeded dataset' : 'User report';
    const badgeClass = `badge ${BADGE_CLASS[item.crimeType] ?? 'badge-other'}`;
    const srcClass = `badge ${item.source === 'SEEDED' ? 'badge-seeded' : 'badge-user'}`;
    const isOwner = currentUserId && item.createdBy === currentUserId;
    const detailLink = isOwner
      ? `<a href="/incidents/${esc(item.id)}">View / Edit details →</a>`
      : `<a href="/incidents/${esc(item.id)}">View full details →</a>`;

    panelContent.innerHTML = `
      <span class="${badgeClass}">${esc(crimeLabel).toUpperCase()}</span>
      <span class="${srcClass}">${esc(sourceLabel).toUpperCase()}</span>
      <p style="margin-top:0.75rem;font-size:0.8rem;color:var(--pico-secondary)">
        ${esc(date)}<br>${esc(item.city)}
      </p>
      <p>${esc(item.description)}</p>
      ${detailLink}
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
    // divIcon so the pulse animation runs entirely in CSS (circleMarker renders
    // as SVG <path>, not <circle>, so CSS :animate selectors can't target it).
    const icon = L.divIcon({
      html: '<div class="user-dot"><div class="user-dot__pulse"></div><div class="user-dot__core"></div></div>',
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    userLocationLayer = L.marker([lat, lng], { icon, zIndexOffset: 10000 })
      .on('click', () => map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true }))
      .addTo(map);
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
      pickpocketing:  'background:var(--badge-pickpocketing-bg);color:var(--badge-pickpocketing-fg)',
      bicycle_stolen: 'background:var(--badge-bicycle-stolen-bg);color:var(--badge-bicycle-stolen-fg)',
      street_fight:   'background:var(--badge-street-fight-bg);color:var(--badge-street-fight-fg)',
      robbery:        'background:var(--badge-robbery-bg);color:var(--badge-robbery-fg)',
      street_scams:   'background:var(--badge-street-scams-bg);color:var(--badge-street-scams-fg)',
    };
    return colors[crimeType] ?? 'background:#f3f4f6;color:#374151';
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
            <option value="bicycle_stolen">Bicycle stolen</option>
            <option value="street_fight">Street fight</option>
            <option value="robbery">Robbery</option>
            <option value="street_scams">Street scam</option>
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
