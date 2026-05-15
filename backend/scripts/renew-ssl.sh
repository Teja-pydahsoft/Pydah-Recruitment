#!/usr/bin/env bash
# Renew Let's Encrypt certificate for srs-backend.pydah.edu.in (nginx).
# Run on the Lightsail instance: sudo bash backend/scripts/renew-ssl.sh

set -euo pipefail

DOMAIN="${SSL_DOMAIN:-srs-backend.pydah.edu.in}"
EMAIL="${SSL_EMAIL:-careers@pydah.edu.in}"

reload_nginx() {
  if systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl reload nginx
  elif command -v nginx >/dev/null 2>&1; then
    nginx -s reload
  fi
}

if ! command -v certbot >/dev/null 2>&1; then
  echo "Installing certbot..."
  apt-get update -qq
  apt-get install -y certbot python3-certbot-nginx
fi

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  echo "Issuing new certificate for ${DOMAIN}..."
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
else
  echo "Renewing certificate for ${DOMAIN}..."
  certbot renew --force-renewal --non-interactive
fi

reload_nginx
echo "SSL renewal complete. Verify: curl -I https://${DOMAIN}/api/health"
