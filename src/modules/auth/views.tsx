// biome-ignore lint/style/useImportType: Html.createElement is the JSX factory — runtime value
import Html from '@kitajs/html';
import { InnerPage } from '../pages/layout';

// ---------------------------------------------------------------------------
// LoginPage — step 1: enter email
// ---------------------------------------------------------------------------

export function LoginPage({
  error,
  prefillEmail,
}: {
  error?: string | undefined;
  prefillEmail?: string | undefined;
}): string {
  return (
    <InnerPage title="Sign in | CrimeLens">
      <div style="max-width:380px">
        <h2>Sign in</h2>
        <p style="color:#6b7280;font-size:0.9rem;margin-bottom:1.5rem">
          Enter your email and we'll send you a sign-in code. No password needed.
        </p>

        {error ? (
          <p class="auth-error" safe>{error}</p>
        ) : ''}

        <form action="/auth/send-code" method="post">
          <label>
            Email address
            <input
              type="email"
              name="email"
              required
              autofocus
              autocomplete="email"
              value={prefillEmail ?? ''}
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" class="contrast" style="width:100%">
            Send sign-in code
          </button>
        </form>
      </div>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// VerifyPage — step 2: enter the 6-digit code
// ---------------------------------------------------------------------------

export function VerifyPage({
  email,
  error,
}: {
  email: string;
  error?: string | undefined;
}): string {
  return (
    <InnerPage title="Enter code | CrimeLens">
      <div style="max-width:380px">
        <h2>Check your inbox</h2>
        <p style="color:#6b7280;font-size:0.9rem;margin-bottom:1.5rem">
          We sent a 6-digit code to <strong safe>{email}</strong>. It expires in 15 minutes.
        </p>

        {error ? (
          <p class="auth-error" safe>{error}</p>
        ) : ''}

        <form action="/auth/verify" method="post">
          <input type="hidden" name="email" value={email} />
          <label>
            Sign-in code
            <input
              type="text"
              name="code"
              required
              autofocus
              autocomplete="one-time-code"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              placeholder="123456"
              style="letter-spacing:0.25em;font-size:1.25rem;text-align:center"
            />
          </label>
          <button type="submit" class="contrast" style="width:100%">
            Sign in
          </button>
        </form>

        <p style="margin-top:1rem;font-size:0.875rem;color:#6b7280">
          Didn't receive it?{' '}
          <a href={`/auth?email=${encodeURIComponent(email)}`}>Resend code</a>
        </p>
      </div>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// AuthErrorPage — unexpected failures
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
