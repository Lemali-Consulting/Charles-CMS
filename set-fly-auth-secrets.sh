#!/bin/bash
# Sets magic-link auth secrets on Fly.io.
# Prompts for values that change per-environment; generates AUTH_SECRET.
# Usage: ./set-fly-auth-secrets.sh
set -euo pipefail

export PATH="$HOME/.fly/bin:$PATH"

APP="${FLY_APP:-charles-crm}"

echo "Setting auth secrets on Fly app: $APP"
echo

# AUTH_URL — deployed origin
read -p "AUTH_URL (e.g. https://${APP}.fly.dev): " AUTH_URL
if [ -z "$AUTH_URL" ]; then
  echo "AUTH_URL is required. Aborting."
  exit 1
fi

# AUTH_RESEND_KEY
read -sp "AUTH_RESEND_KEY (Resend API key, starts with re_): " AUTH_RESEND_KEY
echo
if [ -z "$AUTH_RESEND_KEY" ]; then
  echo "AUTH_RESEND_KEY is required. Aborting."
  exit 1
fi

# AUTH_EMAIL_FROM
read -p 'AUTH_EMAIL_FROM (e.g. "Charles CMS <noreply@yourdomain>"): ' AUTH_EMAIL_FROM
if [ -z "$AUTH_EMAIL_FROM" ]; then
  echo "AUTH_EMAIL_FROM is required. Aborting."
  exit 1
fi

# AUTH_ALLOWED_EMAILS
read -p "AUTH_ALLOWED_EMAILS (comma-separated, e.g. a@x.com,b@y.com): " AUTH_ALLOWED_EMAILS
if [ -z "$AUTH_ALLOWED_EMAILS" ]; then
  echo "AUTH_ALLOWED_EMAILS is required (empty = deny all). Aborting."
  exit 1
fi

# AUTH_SECRET — auto-generate unless one is provided
read -sp "AUTH_SECRET (leave blank to generate a new one): " AUTH_SECRET
echo
if [ -z "$AUTH_SECRET" ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  echo "Generated new AUTH_SECRET."
  echo "NOTE: Rotating AUTH_SECRET invalidates all existing sessions."
fi

echo
echo "About to set these secrets on $APP:"
echo "  AUTH_URL=$AUTH_URL"
echo "  AUTH_EMAIL_FROM=$AUTH_EMAIL_FROM"
echo "  AUTH_ALLOWED_EMAILS=$AUTH_ALLOWED_EMAILS"
echo "  AUTH_RESEND_KEY=<hidden>"
echo "  AUTH_SECRET=<hidden>"
echo
read -p "Proceed? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

fly secrets set \
  "AUTH_SECRET=$AUTH_SECRET" \
  "AUTH_URL=$AUTH_URL" \
  "AUTH_RESEND_KEY=$AUTH_RESEND_KEY" \
  "AUTH_EMAIL_FROM=$AUTH_EMAIL_FROM" \
  "AUTH_ALLOWED_EMAILS=$AUTH_ALLOWED_EMAILS" \
  --app "$APP"

echo
echo "Done. Fly will redeploy the machine with the new secrets."
