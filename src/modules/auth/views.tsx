// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

export function LoginPage({
  userEmail,
  error,
}: {
  userEmail?: string | undefined;
  error?: string | undefined;
}): string {
  return (
    <InnerPage title="Sign in | CrimeLens" userEmail={userEmail}>
      <h2>Sign in</h2>
      {error ? (
        <p class="auth-error" safe>
          {error}
        </p>
      ) : (
        ''
      )}
      <form action="/auth/login" method="post" style="max-width: 380px">
        <label>
          Email
          <input type="email" name="email" required autofocus autocomplete="email" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <button type="submit" class="contrast">
          Sign in
        </button>
      </form>
      <p style="margin-top: 1rem; font-size: 0.875rem">
        No account? <a href="/auth/register">Create one</a>
      </p>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// Register page
// ---------------------------------------------------------------------------

export function RegisterPage({
  error,
  prefill,
}: {
  error?: string | undefined;
  prefill?: { email?: string | undefined; firstName?: string | undefined; lastName?: string | undefined } | undefined;
}): string {
  return (
    <InnerPage title="Create account | CrimeLens">
      <h2>Create account</h2>
      {error ? (
        <p class="auth-error" safe>
          {error}
        </p>
      ) : (
        ''
      )}
      <form action="/auth/register" method="post" style="max-width: 380px">
        <div style="display: flex; gap: 0.75rem">
          <label style="flex: 1">
            First name
            <input
              type="text"
              name="firstName"
              required
              autofocus
              autocomplete="given-name"
              value={prefill?.firstName ?? ''}
            />
          </label>
          <label style="flex: 1">
            Last name
            <input
              type="text"
              name="lastName"
              required
              autocomplete="family-name"
              value={prefill?.lastName ?? ''}
            />
          </label>
        </div>
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autocomplete="email"
            value={prefill?.email ?? ''}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autocomplete="new-password"
            minlength="8"
          />
        </label>
        <button type="submit" class="contrast">
          Create account
        </button>
      </form>
      <p style="margin-top: 1rem; font-size: 0.875rem">
        Already have an account? <a href="/auth">Sign in</a>
      </p>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// Generic auth error (for unexpected failures)
// ---------------------------------------------------------------------------

export function AuthErrorPage({ message }: { message: string }): string {
  return (
    <InnerPage title="Error | CrimeLens">
      <h2>Something went wrong</h2>
      <p safe>{message}</p>
      <p>
        <a href="/auth">← Back to sign in</a>
      </p>
    </InnerPage>
  );
}
