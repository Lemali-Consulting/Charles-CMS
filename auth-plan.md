# Auth Plan — Charles CMS

Single-user, session-based authentication for a Next.js App Router application.

## Approach

- **Login**: Username/password form at `/login`
- **Password storage**: Bcrypt-hashed password stored in an environment variable (`AUTH_PASSWORD_HASH`)
- **Session**: HTTP-only, secure cookie with a signed JWT or random session token
- **Middleware**: Next.js middleware checks the session cookie on every request; redirects to `/login` if missing/invalid
- **Logout**: Clears the session cookie

No database table for users — it's a single-user app, so the credentials live in env vars. This keeps auth completely separate from the app data.

## Implementation Details

### Environment Variables

```
AUTH_PASSWORD_HASH=<bcrypt hash of the password>
SESSION_SECRET=<random 64-char string for signing cookies>
```

### Files to Create/Modify

1. **`src/app/login/page.tsx`** — Login form (client component)
   - Username + password fields, submit button
   - Displays error message on failed login
   - Redirects to `/` on success
   - Should match existing app styling (Tailwind CSS)

2. **`src/app/api/auth/login/route.ts`** — Login API route
   - POST: accepts `{ password }` body
   - Compares against `AUTH_PASSWORD_HASH` using bcrypt
   - On success: sets an HTTP-only, secure, SameSite=strict session cookie
   - On failure: returns 401

3. **`src/app/api/auth/logout/route.ts`** — Logout API route
   - POST: clears the session cookie, returns 200

4. **`src/middleware.ts`** — Next.js middleware
   - Runs on every request except `/login`, `/api/auth/*`, and static assets (`_next`, favicons, etc.)
   - Checks for a valid session cookie
   - If missing/invalid: redirects to `/login`
   - If valid: allows the request through

5. **`src/lib/auth.ts`** — Auth utility functions
   - `verifyPassword(plain, hash)` — bcrypt compare
   - `createSessionToken()` — generate a signed token
   - `verifySessionToken(token)` — validate the token
   - Cookie name, expiry, and options defined here

### Dependencies

- `bcrypt` (or `bcryptjs` for pure JS — no native compilation needed on deploy)
- `jsonwebtoken` (if using JWT for session tokens) — or use Node.js `crypto.sign` to avoid the dependency

### Session Token Strategy

Use a JWT signed with `SESSION_SECRET`:
- Payload: `{ iat, exp }` (no user ID needed — single user)
- Expiry: 30 days (long-lived since single user, low risk)
- Stored in an HTTP-only cookie named `charles-session`

### Security Considerations

- Cookie flags: `HttpOnly`, `Secure` (in production), `SameSite=Strict`, `Path=/`
- No CSRF token needed since we use `SameSite=Strict` and the login is a simple POST
- Rate limiting on login is nice-to-have but not critical for a single-user app behind a domain
- All API routes (`/api/introductions/*`) are also protected by the middleware

### Testing

- Verify unauthenticated requests to `/` redirect to `/login`
- Verify unauthenticated requests to `/api/introductions` return 401
- Verify correct password sets a cookie and redirects to `/`
- Verify incorrect password returns 401 and no cookie
- Verify logout clears the cookie
- Verify requests with a valid cookie pass through to the app

## Open Questions

- Should the client be able to change their own password from the UI, or is it managed via env var?
- Should there be a "remember me" option, or is the 30-day expiry sufficient?
