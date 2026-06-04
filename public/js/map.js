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

  // Restore last map position from sessionStorage, fall back to Europe overview
  const _savedView = (() => {
    try {
      const v = sessionStorage.getItem('mapView');
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  })();

  const map = L.map('map', {
    center: _savedView ? [_savedView.lat, _savedView.lng] : EUROPE_CENTER,
    zoom:   _savedView ? _savedView.zoom : EUROPE_ZOOM,
    zoomControl: false,
  });
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
  map.attributionControl.setPrefix(false);

  // Persist position whenever the user pans or zooms
  map.on('moveend zoomend', function () {
    try {
      const c = map.getCenter();
      sessionStorage.setItem('mapView', JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
    } catch {}
  });

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

  // All paths from Tabler Icons (MIT licence), exact SVG source, 24×24 viewBox.
  const TYPE_ICON_PATHS = {
    // hand-stop
    pickpocketing: `
      <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5"/>
      <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5"/>
      <path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5"/>
      <path d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1-6 6h-2h.208a6 6 0 0 1-5.012-2.7a69.74 69.74 0 0 1-.196-.3c-.312-.479-1.407-2.388-3.286-5.728a1.5 1.5 0 0 1 .536-2.022a1.867 1.867 0 0 1 2.28.28l1.47 1.47"/>`,
    // bike
    bicycle_stolen: `
      <path d="M2 18a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/>
      <path d="M16 18a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/>
      <path d="M12 19v-4l-3-3l5-4l2 3h3"/>
      <path d="M13.007 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>`,
    // sword
    street_fight: `
      <path d="M20 4v5l-9 7l-4 4l-3-3l4-4l7-9l5 0"/>
      <path d="M6.5 11.5l6 6"/>`,
    // wallet-off (wallet being taken)
    robbery: `
      <path d="M17 8v-3a1 1 0 0 0-1-1h-8m-3.413.584a2 2 0 0 0 1.413 3.416h2m4 0h6a1 1 0 0 1 1 1v3"/>
      <path d="M19 19a1 1 0 0 1-1 1h-12a2 2 0 0 1-2-2v-12"/>
      <path d="M16 12h4v4m-4 0a2 2 0 0 1-2-2"/>
      <path d="M3 3l18 18"/>`,
    // eye-off (deception/scam)
    street_scams: `
      <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/>
      <path d="M16.681 16.673a8.717 8.717 0 0 1-4.681 1.327c-3.6 0-6.6-2-9-6c1.272-2.12 2.712-3.678 4.32-4.674m2.86-1.146a9.055 9.055 0 0 1 1.82-.18c3.6 0 6.6 2 9 6c-.666 1.11-1.379 2.067-2.138 2.87"/>
      <path d="M3 3l18 18"/>`,
  };

  function crimeIcon(crimeType) {
    const color = TYPE_COLOR[crimeType] ?? '#9ca3af';
    const paths = TYPE_ICON_PATHS[crimeType] ?? TYPE_ICON_PATHS.street_scams;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16 0 27 16 40 16 40S32 27 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
      <g transform="translate(4,4)" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
    document.getElementById('map-container')?.classList.add('panel-open');
  }

  function showToast(message, linkHref) {
    const existing = document.getElementById('map-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'map-toast';
    toast.className = 'map-toast';
    toast.innerHTML = `<span>${message}</span>${linkHref ? `<a href="${linkHref}" class="map-toast__link">View →</a>` : ''}`;
    document.getElementById('map-container').appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('map-toast--visible'));

    setTimeout(() => {
      toast.classList.remove('map-toast--visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
  }

  function closeDetailPanel() {
    if (!panel) return;
    panel.classList.add('detail-panel--closed');
    panel.classList.remove('detail-panel--open');
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('map-container')?.classList.remove('panel-open');
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

    // Apply initial scale and keep it in sync with zoom
    updateUserDotScale(map.getZoom());
  }

  function updateUserDotScale(zoom) {
    if (!userLocationLayer) return;
    const el = userLocationLayer.getElement();
    if (!el) return;
    const dot = el.querySelector('.user-dot');
    if (!dot) return;
    // Shrink as you zoom in: 1.0 at z5, stays small at z18
    const scale = Math.min(Math.max(2.2 - (zoom - 5) * 0.17, 1.0), 2.2);
    dot.style.transition = 'transform 0.25s ease';
    dot.style.transformOrigin = 'center center';
    dot.style.transform = `scale(${scale.toFixed(3)})`;
  }

  map.on('zoomend', function () { updateUserDotScale(map.getZoom()); });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        showUserLocation(userLat, userLng);
        if (!_savedView) map.setView([userLat, userLng], 13);
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
      // Photon (OSM-based): osm_tag=place:city restricts to OSM "city" rank — major urban centres worldwide
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&osm_tag=place:city&lang=en`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.features ?? []).map((f) => ({
        display_name: [f.properties.name, f.properties.state, f.properties.country].filter(Boolean).join(', '),
        lat: String(f.geometry.coordinates[1]),
        lon: String(f.geometry.coordinates[0]),
        cityName: f.properties.name,
      }));
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
        suppressMoveUpdate = true;
        map.setView([parseFloat(r.lat), parseFloat(r.lon)], 13);
        setTimeout(() => { suppressMoveUpdate = false; }, 2000);
        setCity(r.cityName);
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
        showDropdown(await searchCities(q));
      }, 300);
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
    // Placement cursor stays active for the whole report-mode session —
    // you can click the map at any time to (re)position the pin.
    if (mapContainer) mapContainer.classList.add('report-placing');
    if (userLat !== null && userLng !== null) {
      if (tempMarker) map.removeLayer(tempMarker);
      tempMarker = L.marker([userLat, userLng], { icon: tempPinIcon(), zIndexOffset: 1000 }).addTo(map);
      showReportForm(userLat, userLng);
    } else {
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
        document.getElementById('map-container')?.classList.add('panel-open');
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
    const nowTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    panel.classList.remove('detail-panel--closed');
    panel.classList.add('detail-panel--open');
    panel.removeAttribute('aria-hidden');
    document.getElementById('map-container')?.classList.add('panel-open');

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
          Date &amp; time of incident
          <div style="display:flex;gap:0.5rem">
            <input type="date" name="occurredAtDate" required value="${todayStr}" max="${todayStr}" style="flex:1;min-width:0" />
            <input type="time" name="occurredAtTime" required value="${nowTimeStr}" style="flex:1;min-width:0" />
          </div>
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
        occurredAt: (function() {
          var d = form.occurredAtDate.value + 'T' + (form.occurredAtTime.value || '00:00') + ':00';
          var offset = -new Date().getTimezoneOffset();
          var sign = offset >= 0 ? '+' : '-';
          var pad = function(n) { return String(Math.abs(n)).padStart(2, '0'); };
          return d + sign + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
        })(),
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
        showToast('Incident reported!', `/incidents/${esc(data.id)}`);
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

    // Preserve any values the user already entered before moving the pin
    var savedForm = null;
    var existingForm = document.getElementById('report-incident-form');
    if (existingForm) {
      savedForm = {
        crimeType: existingForm.crimeType?.value,
        description: existingForm.description?.value,
        occurredAtDate: existingForm.occurredAtDate?.value,
        occurredAtTime: existingForm.occurredAtTime?.value,
      };
    }

    showReportForm(lat, lng);

    if (savedForm) {
      var f = document.getElementById('report-incident-form');
      if (f) {
        if (savedForm.crimeType)     f.crimeType.value = savedForm.crimeType;
        if (savedForm.description)   f.description.value = savedForm.description;
        if (savedForm.occurredAtDate) f.occurredAtDate.value = savedForm.occurredAtDate;
        if (savedForm.occurredAtTime) f.occurredAtTime.value = savedForm.occurredAtTime;
      }
    }
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
