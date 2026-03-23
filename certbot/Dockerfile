# Custom Certbot image with curl pre-installed
FROM certbot/certbot:v2.10.0

# Install curl for health checks and monitoring
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Add custom scripts with proper permissions
COPY scripts/renew-ssl.sh /usr/local/bin/renew-ssl.sh
RUN chmod +x /usr/local/bin/renew-ssl.sh && \
    chown root:root /usr/local/bin/renew-ssl.sh

# Configure cron job (autonomous image - no compose dependency)
RUN echo "0 */12 * * * /usr/local/bin/renew-ssl.sh" > /etc/crontabs/root && \
    chmod 0600 /etc/crontabs/root

# Set working directory
WORKDIR /etc/letsencrypt

# Explicit user (certbot needs root for certificates)
USER root

# Default command - autonomous cron daemon
CMD ["crond", "-f"]
