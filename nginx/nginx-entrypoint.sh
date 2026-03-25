#!/bin/sh
# nginx-entrypoint.sh - Template processing with envsubst

set -e

# Process template with environment variables
envsubst '${DOMAIN}' < /nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
