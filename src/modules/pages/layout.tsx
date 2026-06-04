// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value, not type-only
import Html from '@kitajs/html';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LayoutProps {
  title?: string | undefined;
  head?: Html.Children | undefined;
  children: Html.Children;
}

// ---------------------------------------------------------------------------
// Root layout (bare shell — no nav)
// ---------------------------------------------------------------------------

export function Layout({ title = 'CrimeLens', head, children }: LayoutProps): string {
  return `<!DOCTYPE html>${(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title safe>{title}</title>

        {/* Leaflet */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H"
          crossorigin="anonymous"
        />
        <link rel="stylesheet" href="/css/app.css?v=52" />
        <link rel="icon" type="image/svg+xml" href="/img/logo.svg" />

        {head}
      </head>
      <body>
        {children}

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
// Helpers
// ---------------------------------------------------------------------------

/** "uladzimir.k@example.com" → "Uladzimir" */
function displayName(email: string): string {
  const local = (email.split('@')[0] ?? email).trim();
  const firstToken = local.split(/[\s._\-+]+/).filter(Boolean)[0] ?? local;
  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Map page
// ---------------------------------------------------------------------------

export function MapPage({
  userEmail,
  isAuthenticated,
  userId,
  hasAvatar,
}: {
  userEmail?: string | undefined;
  isAuthenticated?: boolean | undefined;
  userId?: string | undefined;
  hasAvatar?: boolean | undefined;
}): string {
  return (
    <Layout title="CrimeLens — Crime Map">
      <div id="map-container" data-user-id={userId ?? ''}>
        {/* Full-screen map */}
        <div id="map" />
        <div id="map-loading" class="map-loading-corner" aria-hidden="true">Loading…</div>
        <div id="map-error" />

        {/* ── Filter bar — floating top-left ── */}
        <div class="filter-bar">
          <form class="filter-form" id="filter-form">
            <label class="pill pill-pickpocketing">
              <input type="checkbox" name="types" value="pickpocketing" />
              <span>Pickpocketing</span>
            </label>
            <label class="pill pill-bicycle-stolen">
              <input type="checkbox" name="types" value="bicycle_stolen" />
              <span>Bicycle stolen</span>
            </label>
            <label class="pill pill-street-fight">
              <input type="checkbox" name="types" value="street_fight" />
              <span>Street fight</span>
            </label>
            <label class="pill pill-robbery">
              <input type="checkbox" name="types" value="robbery" />
              <span>Robbery</span>
            </label>
            <label class="pill pill-street-scams">
              <input type="checkbox" name="types" value="street_scams" />
              <span>Street scam</span>
            </label>
          </form>
        </div>

        {/* ── Right sidebar ── */}
        <aside class="sidebar" id="sidebar">
          {/* Brand */}
          <div class="sidebar-brand">
            <img src="/img/logo-dark.svg" alt="" class="sidebar-logo" />
            <span class="sidebar-title">CrimeLens</span>
          </div>

          {/* City search */}
          <div class="sidebar-search-wrap">
            <span class="sidebar-search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </span>
            <input
              type="text"
              id="city-search"
              class="sidebar-search"
              placeholder="Search city…"
              autocomplete="off"
            />
            <div id="city-search-dropdown" class="search-dropdown" />
          </div>

          {/* Time period */}
          <div class="sidebar-time">
            <span class="sidebar-time-label">Time period:</span>
            <select id="since-select" name="since" class="sidebar-time-select">
              <option value="all" selected>All time</option>
              <option value="1y">Last year</option>
              <option value="90d">Last 90 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <div class="sidebar-divider" />

          {/* Live incident feed */}
          <div class="incident-feed" id="incident-feed">
            <div class="incident-feed__empty">Loading recent incidents…</div>
          </div>

          <div class="sidebar-divider" />

          {/* Actions */}
          <div class="sidebar-actions">
            <p class="sidebar-action-hint">Witness a crime?</p>
            {isAuthenticated ? (
              <button id="report-btn" type="button" class="sidebar-action-btn sidebar-action-btn--primary">
                Report Incident
              </button>
            ) : (
              <a href="/auth" class="sidebar-action-btn sidebar-action-btn--primary">
                Sign in to report
              </a>
            )}

          </div>

          {/* User section — pinned to bottom */}
          <div class="sidebar-user">
            {userEmail ? (
              <div class="user-row">
                <a href="/profile" class="user-avatar-link" title="View profile">
                  <img
                    src={hasAvatar && userId
                      ? `/api/avatar/${userId}`
                      : `https://api.dicebear.com/9.x/lorelei/svg?seed=${userId ?? encodeURIComponent(userEmail ?? '')}`}
                    alt="Your profile"
                    class="user-avatar user-avatar--img"
                  />
                </a>
                <a href="/profile" class="user-name" safe>{userEmail}</a>
                <form action="/auth/logout" method="post" class="user-logout-form">
                  <button type="submit" class="user-logout-btn">Sign out</button>
                </form>
              </div>
            ) : (
              <a href="/auth" class="user-signin-link">
                <div class="user-avatar user-avatar--guest" aria-hidden="true">?</div>
                <span>Sign in / Register</span>
              </a>
            )}
          </div>
        </aside>

        {/* Detail panel (incident click / report form) */}
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

      <script src="/js/map.js?v=60" defer />
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Generic inner-page shell
// ---------------------------------------------------------------------------

export function InnerPage({
  title,
  userEmail,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  userEmail?: string | undefined;
  backHref?: string | undefined;
  backLabel?: string | undefined;
  children: Html.Children;
}): string {
  return (
    <Layout title={title}>
      {/* Minimal top bar for inner pages */}
      <nav class="inner-nav">
        <a href="/" class="inner-nav__brand">
          <img src="/img/logo.svg" alt="" class="inner-nav__logo" />
          <span>CrimeLens</span>
        </a>
        <div class="inner-nav__actions">
          {userEmail ? (
            <form action="/auth/logout" method="post" class="nav-logout-form">
              <span class="nav-user-chip">{displayName(userEmail)}</span>
              <button type="submit" class="nav-btn nav-btn--ghost">Sign out</button>
            </form>
          ) : (
            <a href="/auth" class="nav-btn nav-btn--primary">Sign in</a>
          )}
        </div>
      </nav>
      <main class="container inner-page" id="inner-page-main">
        <p>
          <a href={backHref ?? '/'} class="back-link">← {backLabel ?? 'Back to map'}</a>
        </p>
        {children}
      </main>
      <script>{`
        document.documentElement.classList.add('inner-page-body');
        function openModal(id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.style.display = 'flex';
          requestAnimationFrame(function() { el.classList.add('modal-open'); });
        }
        function closeModal(id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.classList.remove('modal-open');
          el.addEventListener('transitionend', function hide() {
            el.style.display = 'none';
            el.removeEventListener('transitionend', hide);
          });
        }
      `}</script>
    </Layout>
  );
}
