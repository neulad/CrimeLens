import Html from '@kitajs/html';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LayoutProps {
  title?: string;
  /** Current user email, if authenticated */
  userEmail?: string;
  /** Extra <head> content (e.g. page-specific styles) */
  head?: Html.Children;
  children: Html.Children;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export function Layout({ title = 'CrimeLens', userEmail, head, children }: LayoutProps): string {
  return `<!DOCTYPE html>${(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title safe>{title}</title>

        {/* Pico.css — classless base */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        {/* Leaflet */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
        />
        {/* App overrides */}
        <link rel="stylesheet" href="/css/app.css" />
        <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />

        {head}
      </head>
      <body>
        <Nav userEmail={userEmail} />
        {children}

        {/* HTMX */}
        <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"></script>
        {/* Leaflet + cluster */}
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
      </body>
    </html>
  )}`;
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function Nav({ userEmail }: { userEmail?: string }): string {
  return (
    <nav class="container-fluid">
      <ul>
        <li>
          <a href="/" class="wordmark">
            CrimeLens
          </a>
        </li>
      </ul>
      <ul>
        <li>
          <a href="/lost-and-found">Lost &amp; Found</a>
        </li>
        {userEmail ? (
          <li>
            <form action="/auth/logout" method="post" style="display:inline">
              <span class="nav-user" safe>
                {userEmail}
              </span>
              &nbsp;
              <button type="submit" class="outline secondary nav-logout">
                Sign out
              </button>
            </form>
          </li>
        ) : (
          <li>
            <a href="/auth" role="button" class="outline">
              Sign in
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Map page
// ---------------------------------------------------------------------------

export function MapPage({ userEmail }: { userEmail?: string }): string {
  return (
    <Layout title="CrimeLens — Crime Map" userEmail={userEmail}>
      {/* Filter bar */}
      <div id="filter-bar" class="filter-bar">
        <form class="filter-form container-fluid">
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
      </div>

      {/* Map container */}
      <div id="map-container">
        <div id="map-loading" class="map-loading" aria-hidden="true">
          <span aria-label="Loading incidents">Loading…</span>
        </div>
        <div id="map" />
        <div id="map-error" hx-swap-oob="true" />
      </div>

      {/* Detail panel — hidden until a marker is clicked */}
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

      {/* Map JS island — loaded last so Leaflet is available */}
      <script src="/js/map.js" defer />
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
  userEmail?: string;
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
