#!/bin/sh
# nginx-entrypoint.sh - Template processing with envsubst

set -e

# Process template with environment variables
envsubst '${DOMAIN}' < /nginx.conf.template > /etc/nginx/conf.d/default.conf

# Development: logs to stdout, Production: logs to files
if [ "${ENVIRONMENT}" = "development" ]; then
    echo "🔧 Development mode: logs to stdout/stderr"
    exec nginx -g 'daemon off; access_log /dev/stdout json_combined; error_log /dev/stderr warn;'
else
    echo "🚀 Production mode: logs to /var/log/nginx/"
    exec nginx -g 'daemon off;'
fi
