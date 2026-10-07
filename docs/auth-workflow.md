# Login and signup workflow

`/login` and `/signup` provide account forms and Preview mode credentials for mock testing. Successful signup signs in immediately. The workspace routes restore only after the session is checked; a signed-out visit returns to the requested workspace path after login. Return destinations are restricted to `/`, `/transactions`, `/review`, `/reports`, and `/demo` with their query strings and fragments.

The default mode is **mock**. Accounts and login state belong to the current browser profile, so use invented details and a password you do not use elsewhere. A built-in test account uses the Preview mode credentials `demo@finance.app` / `Demo1234!`; enter them in the login form to explore the sample workspace. Newly registered accounts can sign out and sign back in, including after refreshing.

Signup accepts a name of 2–80 characters, a valid email, and a password of 8–128 characters containing a letter and a number. Names and emails are trimmed; emails are compared without case. Passwords are kept exactly as typed. Password confirmation is a form concern and is not sent to the adapter.

## Browser persistence

- `finance-auth-accounts-v1` in local storage holds registered mock users with a random salt and PBKDF2 SHA-256 password digest (100,000 iterations). Raw passwords are never saved.
- `finance-auth-session-v1` in session storage holds the active user ID for the current tab.
- `finance-auth-remembered-session-v1` in local storage holds the active user ID when Remember me is selected.

Remember me restores across browser sessions. Without it, login normally lasts for the tab's session; a browser's tab/session restore feature can retain session storage. Signing in again replaces the other persistence choice. Logout attempts to clear both session stores and retains registered accounts. Malformed sessions are discarded. Corrupt account data produces a clear error rather than deleting registrations. Storage failures produce an error and do not report a successful login or signup. The demo ID is stable: `finance-demo-user`.

This is a testing adapter, not production authentication. Browser storage and client route checks can be edited or bypassed, and the locally stored password digests are accessible to scripts in the page. The mock has no server authorization, recovery emails, email verification, rate limits, device management, or cross-device accounts. Simultaneous changes in different tabs are not a database transaction. Clearing browser storage removes all mock registrations and saved workspace data.

## Connect a backend

UI and session state depend on `AuthAdapter` in `src/auth/types.ts`, selected in `src/auth/client.ts`. Implement a replacement adapter or enable the included API adapter by creating `.env.local` at the repository root:

```dotenv
NEXT_PUBLIC_AUTH_MODE=api
```

Restart development or rebuild deployment after changing this variable; Next.js embeds `NEXT_PUBLIC_` values at build time. It is a mode flag, never a place for credentials or secrets. The API adapter uses same-origin `/api/auth/*` endpoints, `credentials: "include"`, and `cache: "no-store"`. The endpoints are integration contracts; this change does not provide a backend or database.

| Endpoint | Request | Successful response |
| --- | --- | --- |
| `GET /api/auth/session` | No body | `200` with `AuthSession`, `200` with `null`, or `401` when signed out |
| `POST /api/auth/login` | `{ email, password, rememberMe }` | `200` with `AuthSession` and a server session cookie |
| `POST /api/auth/signup` | `{ name, email, password, rememberMe }` | `200` or `201` with `AuthSession` and a server session cookie |
| `POST /api/auth/logout` | No body | `204`, or another successful status; revoke and clear the server session cookie |

`AuthSession` is JSON shaped as `{ "user": { "id": "stable-user-id", "name": "Alex Morgan", "email": "alex@example.com" } }`. Only these public user fields are consumed. Return `401` for bad credentials, `409` for an email already in use, and `429` for rate-limited attempts. Other failures display a general service message; arbitrary server response text is not shown. Successful responses must contain the documented session shape. Preview mode credentials are shown only in mock mode; API logins are checked by the backend.

Before production, validate credentials and uniqueness on the server, hash passwords with a production password library, issue secure HttpOnly cookies, enforce appropriate session expiry for Remember me, and protect state-changing endpoints against CSRF. Check session authorization beside every protected data access and mutation; the browser gate is presentation behavior. Query workspace records by the authenticated server user ID. The existing financial scenario remains fictional browser data; it must be replaced with per-user server data rather than trusted as financial records.

Run `npm test` to cover registration, credential checks, hashing, duplicate emails, persistence, logout, corrupt and unavailable storage, safe destinations, and the API contract. Browser checks are still needed for keyboard flow, validation feedback, redirects, loading states, and narrow layouts.
