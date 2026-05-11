// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value, not type-only
import Html from '@kitajs/html';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LayoutProps {
  title?: string | undefined;
  /** Current user email, if authenticated */
  userEmail?: string | undefined;
  /** Extra <head> content (e.g. page-specific styles) */
  head?: Html.Children | undefined;
  /** Optional filter controls rendered in the centre of the nav */
  navFilters?: Html.Children | undefined;
  children: Html.Children;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export function Layout({ title = 'CrimeLens', userEmail, head, navFilters, children }: LayoutProps): string {
  return `<!DOCTYPE html>${(
    <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title safe>{title}</title>

        {/* Pico.css — classless base */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
          integrity="sha384-L1dWfspMTHU/ApYnFiMz2QID/PlP1xCW9visvBdbEkOLkSSWsP6ZJWhPw6apiXxU"
          crossorigin="anonymous"
        />
        {/* Leaflet */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H"
          crossorigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
          integrity="sha384-pmjIAcz2bAn0xukfxADbZIb3t8oRT9Sv0rvO+BR5Csr6Dhqq+nZs59P0pPKQJkEV"
          crossorigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
          integrity="sha384-wgw+aLYNQ7dlhK47ZPK7FRACiq7ROZwgFNg0m04avm4CaXS+Z9Y7nMu8yNjBKYC+"
          crossorigin="anonymous"
        />
        {/* App overrides — ?v= suffix busts the 24 h static-file cache */}
        <link rel="stylesheet" href="/css/app.css?v=30" />
        <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />

        {head}
      </head>
      <body>
        <Nav userEmail={userEmail} navFilters={navFilters} />
        {children}

        {/* HTMX */}
        <script
          src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"
          integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+"
          crossorigin="anonymous"
        />
        {/* Leaflet + cluster */}
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH"
          crossorigin="anonymous"
        />
        <script
          src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"
          integrity="sha384-eXVCORTRlv4FUUgS/xmOyr66XBVraen8ATNLMESp92FKXLAMiKkerixTiBvXriZr"
          crossorigin="anonymous"
        />
      </body>
    </html>
  )}`;
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

/** "uladzimir.k@example.com" → "Uladzimir" (first name only) */
function displayName(email: string): string {
  const local = (email.split('@')[0] ?? email).trim();
  // Split on any separator: space, dot, underscore, dash, plus
  const firstToken = local.split(/[\s._\-+]+/).filter(Boolean)[0] ?? local;
  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
}

function Nav({
  userEmail,
  navFilters,
}: {
  userEmail?: string | undefined;
  navFilters?: Html.Children | undefined;
}): string {
  return (
    <nav class="app-nav">
      {/* Brand */}
      <div class="nav-brand">
        <a href="/" class="wordmark">
          <img src="/img/logo.svg" alt="" class="wordmark-logo" />
          <span>CrimeLens</span>
        </a>
      </div>

      {/* Centre slot — filters on map page, empty otherwise */}
      <div class="nav-filters">{navFilters ?? ''}</div>

      {/* Actions */}
      <div class="nav-actions">
        <a href="/lost-and-found" class="nav-btn nav-btn--ghost">
          Lost &amp; Found
        </a>
        {userEmail ? (
          <form action="/auth/logout" method="post" class="nav-logout-form">
            <span class="nav-user-chip">
              {displayName(userEmail)}
            </span>
            <button type="submit" class="nav-btn nav-btn--ghost">
              Sign out
            </button>
          </form>
        ) : (
          <a href="/auth" class="nav-btn nav-btn--primary">
            Sign in
          </a>
        )}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Map page
// ---------------------------------------------------------------------------

export function MapPage({
  userEmail,
  isAuthenticated,
}: {
  userEmail?: string | undefined;
  isAuthenticated?: boolean | undefined;
}): string {
  const filters = (
    <form class="nav-filter-form" id="filter-form">
      <span class="filter-label">Show:</span>

      <label class="pill pill-pickpocketing">
        <input type="checkbox" name="types" value="pickpocketing" checked />
        <span>Pickpocketing</span>
      </label>
      <label class="pill pill-bag">
        <input type="checkbox" name="types" value="bag_snatching" checked />
        <span>Bag snatching</span>
      </label>
      <label class="pill pill-vehicle">
        <input type="checkbox" name="types" value="theft_from_vehicle" checked />
        <span>Vehicle theft</span>
      </label>
      <label class="pill pill-other">
        <input type="checkbox" name="types" value="other" checked />
        <span>Other</span>
      </label>

      <div class="filter-divider" />

      <select name="since" id="since-select">
        <option value="all" selected>
          All time
        </option>
        <option value="1y">Last year</option>
        <option value="90d">Last 90 days</option>
        <option value="30d">Last 30 days</option>
      </select>
    </form>
  );

  return (
    <Layout title="CrimeLens — Crime Map" userEmail={userEmail} navFilters={filters}>
      {/* Map container */}
      <div id="map-container">
        <div id="map-loading" class="map-loading" aria-hidden="true">
          <span aria-label="Loading incidents">Loading…</span>
        </div>
        <div id="map" />
        <div id="map-error" hx-swap-oob="true" />

        {/* Report button — only shown to authenticated users */}
        {isAuthenticated ? (
          <button id="report-btn" type="button" class="report-btn">
            📍 Report incident
          </button>
        ) : (
          ''
        )}

        {/* Detail panel */}
        <aside id="detail-panel" class="detail-panel detail-panel--closed" aria-hidden="true">
          <button
            type="button"
            id="detail-close"
            class="detail-close"
            aria-label="Close detail panel"
          >
            ✕
          </button>
          <div id="detail-content" />
        </aside>
      </div>

      {/* Map JS island — loaded last so Leaflet is available */}
      <script src="/js/map.js?v=8" defer />
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Generic inner-page shell (about, incidents/:id, etc.)
// ---------------------------------------------------------------------------

export function InnerPage({
  title,
  userEmail,
  children,
}: {
  title: string;
  userEmail?: string | undefined;
  children: Html.Children;
}): string {
  return (
    <Layout title={title} userEmail={userEmail}>
      <main class="container inner-page">
        <p>
          <a href="/" class="back-link">
            ← Back to map
          </a>
        </p>
        {children}
      </main>
    </Layout>
  );
}
