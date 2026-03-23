# Custom Certbot image with curl pre-installed
FROM certbot/certbot:v2.10.0

# Build argument for domain (multi-domain support)
ARG DOMAIN=playrke.com

# Environment variable for runtime domain configuration
ENV DOMAIN=$DOMAIN

# Install curl for health checks and monitoring
RUN apk add --no-cache curl

# Add custom scripts with proper permissions
COPY scripts/renew-ssl.sh /usr/local/bin/renew-ssl.sh
RUN chmod +x /usr/local/bin/renew-ssl.sh && \
    chown root:root /usr/local/bin/renew-ssl.sh

# Configure cron job (autonomous image - no compose dependency)
RUN echo "0 */12 * * * /usr/local/bin/renew-ssl.sh" > /etc/crontabs/root && \
    chmod 0600 /etc/crontabs/root

# Set working directory
WORKDIR /etc/letsencrypt

# Default command - autonomous cron daemon with logging
CMD ["crond", "-f", "-l", "2"]

# Healthcheck - portable outside compose, domain-agnostic
HEALTHCHECK --interval=1m --timeout=5s --retries=3 \
    CMD test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem || exit 1
