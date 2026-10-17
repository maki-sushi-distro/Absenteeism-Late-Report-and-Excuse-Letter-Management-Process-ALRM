#!/usr/bin/env bash
set -euo pipefail

cd /var/www/html

sed -i "s/80/${PORT:-10000}/g" \
    /etc/apache2/sites-available/000-default.conf \
    /etc/apache2/ports.conf

php artisan config:cache
php artisan migrate --force

# Artisan may have created cache/log files as root during startup.
chown -R www-data:www-data storage bootstrap/cache

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/alrm.conf
