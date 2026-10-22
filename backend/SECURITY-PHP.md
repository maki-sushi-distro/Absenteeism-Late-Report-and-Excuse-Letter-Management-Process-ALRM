# PHP security deployment: CERT-EU 2026-018

The PHP engine fixes CVE-2026-109618 and CVE-2026-109619. Laravel validation,
authentication, Composer package updates, and request limits cannot replace
the runtime patch: exploitation can occur before application code executes.

Sources:
- https://cert.europa.eu/publications/security-advisories/2026-018
- https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w
- https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp

## Changes in this backend

- Docker uses `php:8.4.27-apache`, a patched PHP 8.4 release.
- Composer permits only patched releases within PHP 8.3, 8.4, and 8.5.
- Image build and container startup check the actual PHP version independently
  of Composer. Unknown future branches require explicit review before use.
- PHP disables session upload progress before request parsing. Apache locks
  this setting against application overrides in the public document root.
- Apache caps request bodies at 8 MiB, including chunked bodies, and limits
  request headers. PHP caps individual uploads at 2 MiB, total POST bodies at
  8 MiB, file uploads at 5, input variables at 1000, nesting at 64, and multipart
  parts at 1050. The existing evidence API accepts one file of at most 2 MiB.
- Finite memory limits remain in place on the patched engine. Do not treat
  `memory_limit=-1` as a complete fix or enable it without host memory controls.

## Deploy and verify

From `backend/`, build a fresh image:

```sh
docker build --pull --no-cache -t alrm-backend:php-security .
docker run --rm alrm-backend:php-security php /usr/local/bin/alrm-check-runtime.php
docker run --rm alrm-backend:php-security apache2ctl -t
docker run --rm alrm-backend:php-security php --ri session
docker run --rm alrm-backend:php-security php -i
```

Check that PHP reports 8.4.27, session upload progress is Off, and the configured
upload/input limits are effective. Redeploy this image using the existing host's
environment and database settings. Replace every running replica and restart all
Apache and queue workers; old containers retain the old runtime. Verify inside
each deployed container as well, then smoke-test login, a valid evidence upload,
and a rejected upload above 2 MiB. A body above 8 MiB should receive Apache 413.
Also verify a chunked body above 8 MiB is rejected before Laravel runs.

The version check alone confirms the engine version, not the complete web-server
configuration. Inspect the active Apache configuration and PHP configuration for
the web SAPI too; CLI and Apache can use different PHP installations/settings.
Do not publish a public `phpinfo()` endpoint for verification.

## Local XAMPP or other non-Docker hosting

The local CLI observed during this change was `C:\xampp\php\php.exe`, PHP 8.5.4.
That version is below the fixed PHP 8.5.12 release. Upgrade the actual PHP
installation used by Apache and CLI to a supported patched release (8.5.12+
within 8.5, or the patched 8.4/8.3 branches), using a compatible vendor package.
Repository changes do not upgrade XAMPP or a remote hosting server.

For Apache mod_php, apply the settings in `docker/php-security.ini` to the active
web `php.ini` and adapt `docker/apache-security.conf` to the host's real public
directory. For PHP-FPM, disable upload progress in the pool using
`php_admin_flag[session.upload_progress.enabled] = off`, set the upload/input
limits before parsing, and enforce the body limit at the proxy/web server.
Restart every web worker after updating. On PHP 8.5, additionally set
`fatal_error_backtraces = Off` in the active `php.ini` as defense in depth.

Run `php -v`, `php docker/check-runtime.php`, and
`composer check-platform-reqs --lock --no-dev` using the upgraded PHP, and verify
the web SAPI separately. Keep affected internet-facing deployments isolated
until their runtime patch is applied and verified. Temporary mitigations only
reduce specific attack paths; they do not make an unpatched engine safe.
