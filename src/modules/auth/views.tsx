// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';

// ---------------------------------------------------------------------------
// Sign-in page — email request form
// ---------------------------------------------------------------------------

export function AuthPage({ userEmail }: { userEmail?: string | undefined }): string {
  return (
    <InnerPage title="Sign in | CrimeLens" userEmail={userEmail}>
      <h2>Sign in</h2>
      <p>Enter your email address and we'll send you a magic link — no password needed.</p>
      <form action="/auth/request" method="post" style="max-width: 380px">
        <label>
          Email address
          <input
            type="email"
            name="email"
            required
            autofocus
            placeholder="you@example.com"
            autocomplete="email"
          />
        </label>
        <button type="submit" class="contrast">
          Send magic link
        </button>
      </form>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// Check your email confirmation
// ---------------------------------------------------------------------------

export function AuthCheckEmailPage(): string {
  return (
    <InnerPage title="Check your email | CrimeLens">
      <h2>Check your email ✉️</h2>
      <p>
        We've sent a sign-in link to your inbox. Click it within 15 minutes — the link can only be
        used once.
      </p>
      <p>
        <small>Didn't receive it? Check your spam folder or </small>
        <a href="/auth">
          <small>try again</small>
        </a>
        <small>.</small>
      </p>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// Auth error page
// ---------------------------------------------------------------------------

export function AuthErrorPage({ message }: { message: string }): string {
  return (
    <InnerPage title="Sign-in error | CrimeLens">
      <h2>Sign-in failed</h2>
      <p safe>{message}</p>
      <p>
        <a href="/auth">← Try again</a>
      </p>
    </InnerPage>
  );
}
