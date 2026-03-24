# Custom Certbot image with curl pre-installed
FROM certbot/certbot:v2.10.0

# Build argument for domain (multi-domain support)
ARG DOMAIN=playrke.com

# Environment variable for runtime domain configuration
ENV DOMAIN=$DOMAIN

# Install curl for health checks and monitoring
RUN apk add --no-cache curl openssl

# Create directories for certbot
RUN mkdir -p /var/www/certbot

# Add custom scripts with proper permissions
COPY scripts/renew-ssl.sh /usr/local/bin/renew-ssl.sh
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/renew-ssl.sh /usr/local/bin/docker-entrypoint.sh && \
    chown root:root /usr/local/bin/renew-ssl.sh /usr/local/bin/docker-entrypoint.sh

# Configure cron job for automatic renewals (backup to entrypoint)
RUN echo "0 */12 * * * /usr/local/bin/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1" > /etc/crontabs/root && \
    chmod 0600 /etc/crontabs/root

# Set working directory
WORKDIR /etc/letsencrypt

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Healthcheck - portable outside compose, domain-agnostic
HEALTHCHECK --interval=1m --timeout=5s --retries=3 \
    CMD test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem || exit 1
