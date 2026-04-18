#!/bin/bash
# Sets Sentry secrets on Fly.io.
# Prompts for the server + client DSNs, plus optional source-map upload creds.
# Usage: ./set-fly-sentry-secrets.sh
set -euo pipefail

export PATH="$HOME/.fly/bin:$PATH"

APP="${FLY_APP:-charles-crm}"

echo "Setting Sentry secrets on Fly app: $APP"
echo

# SENTRY_DSN — server-side
read -sp "SENTRY_DSN (server DSN, from Sentry → Project → Client Keys): " SENTRY_DSN
echo
if [ -z "$SENTRY_DSN" ]; then
  echo "SENTRY_DSN is required. Aborting."
  exit 1
fi

# NEXT_PUBLIC_SENTRY_DSN — client-side (baked into browser bundle at build time)
read -sp "NEXT_PUBLIC_SENTRY_DSN (client DSN — often the same as server DSN): " NEXT_PUBLIC_SENTRY_DSN
echo
if [ -z "$NEXT_PUBLIC_SENTRY_DSN" ]; then
  echo "NEXT_PUBLIC_SENTRY_DSN is required. Aborting."
  exit 1
fi

# Optional: source-map upload creds
echo
echo "Optional: source-map upload (lets Sentry symbolicate minified stack traces)."
echo "Skip by leaving all three blank."
read -p "SENTRY_ORG (Sentry org slug, e.g. lemali): " SENTRY_ORG
read -p "SENTRY_PROJECT (Sentry project slug, e.g. charles-cms): " SENTRY_PROJECT
read -sp "SENTRY_AUTH_TOKEN (user auth token with project:releases scope): " SENTRY_AUTH_TOKEN
echo

SET_ARGS=(
  "SENTRY_DSN=$SENTRY_DSN"
  "NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN"
)

UPLOAD_CONFIGURED=false
if [ -n "$SENTRY_ORG" ] || [ -n "$SENTRY_PROJECT" ] || [ -n "$SENTRY_AUTH_TOKEN" ]; then
  if [ -z "$SENTRY_ORG" ] || [ -z "$SENTRY_PROJECT" ] || [ -z "$SENTRY_AUTH_TOKEN" ]; then
    echo "Partial source-map config detected — all three of SENTRY_ORG, SENTRY_PROJECT,"
    echo "SENTRY_AUTH_TOKEN must be set together. Aborting."
    exit 1
  fi
  SET_ARGS+=(
    "SENTRY_ORG=$SENTRY_ORG"
    "SENTRY_PROJECT=$SENTRY_PROJECT"
    "SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN"
  )
  UPLOAD_CONFIGURED=true
fi

echo
echo "About to set these secrets on $APP:"
echo "  SENTRY_DSN=<hidden>"
echo "  NEXT_PUBLIC_SENTRY_DSN=<hidden>"
if [ "$UPLOAD_CONFIGURED" = true ]; then
  echo "  SENTRY_ORG=$SENTRY_ORG"
  echo "  SENTRY_PROJECT=$SENTRY_PROJECT"
  echo "  SENTRY_AUTH_TOKEN=<hidden>"
else
  echo "  (skipping source-map upload — SENTRY_ORG/PROJECT/AUTH_TOKEN unset)"
fi
echo
read -p "Proceed? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

fly secrets set "${SET_ARGS[@]}" --app "$APP"

echo
echo "Done. Fly will redeploy the machine with the new secrets."
if [ "$UPLOAD_CONFIGURED" = false ]; then
  echo
  echo "Source-map upload is skipped; stack traces in Sentry will show minified code."
  echo "To enable later, re-run this script with SENTRY_ORG/PROJECT/AUTH_TOKEN filled in."
fi
