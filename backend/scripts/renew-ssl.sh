#!/usr/bin/env bash
# Renew Let's Encrypt certificate for srs.pydah.edu.in (nginx).
# Run on the Lightsail instance: sudo bash backend/scripts/renew-ssl.sh

set -euo pipefail

DOMAIN="${SSL_DOMAIN:-srs.pydah.edu.in}"
EMAIL="${SSL_EMAIL:-careers@pydah.edu.in}"

reload_nginx() {
  if systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl reload nginx
  elif command -v nginx >/dev/null 2>&1; then
    nginx -s reload
  fi
}

enable_auto_renew_timer() {
  # Letsencrypt installs a systemd timer; ensure it stays enabled on reboot.
  if systemctl list-unit-files certbot.timer 2>/dev/null | grep -q certbot.timer; then
    systemctl enable certbot.timer
    systemctl start certbot.timer
    echo "certbot.timer enabled (runs twice daily on the server)."
  elif [ -d /etc/cron.d ] && [ ! -f /etc/cron.d/certbot-renew ]; then
    echo "0 3,15 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx || nginx -s reload'" \
      > /etc/cron.d/certbot-renew
    echo "Installed /etc/cron.d/certbot-renew fallback."
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
  if certbot renew --non-interactive; then
    echo "Certificate renewed (or not yet due)."
  else
    echo "Standard renew failed; forcing renewal (expired or misconfigured cert)..."
    certbot renew --force-renewal --non-interactive
  fi
fi

enable_auto_renew_timer
reload_nginx
echo "SSL renewal complete. Verify: curl -I https://${DOMAIN}/api/health"
