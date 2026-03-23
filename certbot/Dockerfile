# Custom Certbot image with curl pre-installed
FROM certbot/certbot:latest

# Install curl for health checks and monitoring
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Add custom scripts
COPY scripts/renew-ssl.sh /usr/local/bin/renew-ssl.sh
RUN chmod +x /usr/local/bin/renew-ssl.sh

# Set working directory
WORKDIR /etc/letsencrypt

# Default command
CMD ["sh", "-c", "crond -f"]
