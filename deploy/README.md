# godaug.fun production deployment

Deployment is being performed in stages on the existing Ubuntu server. The
database configuration in this directory is separate from the older root
`docker-compose.prod.yml`.

## Prepare database configuration

After pulling the reviewed commit into `/opt/realweb`, run as root:

```bash
node /opt/realweb/deploy/prepare-env.cjs
docker compose -f /opt/realweb/deploy/mongodb.compose.yml config --quiet
```

The Node script generates new credentials in `.env` and `.env.mongodb` with
mode `0600`. It refuses to replace either existing file. It does not read or
reuse the committed `.env.production` file, contact a database, initialize an
administrator account, or start application processes.

Both generated files must be preserved. `.env.mongodb` is root-only database
configuration. `.env` is the backend configuration; systemd reads it as root
and supplies its values to the backend service account. SMTP
values point to local ports as placeholders. Sending and receiving mail still
require their own configuration and verification.

`config --quiet` validates Compose without printing expanded secrets. Successful
validation normally produces no output.

## Database design

- Compose project name: `realweb`; service: `mongodb`.
- Image: `mongo:7.0.45-jammy`, matching the Mongoose 7 supported server series.
- Host endpoint: `127.0.0.1:27017`; authentication is enabled.
- The backend uses a separate account with `readWrite` on
  `personal_website_prod`, rather than the database root account.
- Data and config use project-specific named volumes, `realweb_mongodb_data`
  and `realweb_mongodb_config`.
- The container has a 2 GiB memory limit and a 0.5 GiB WiredTiger cache.
- Health checks authenticate with database administrator credentials.
- The Watchtower label disables automatic updates for this database container.

User initialization scripts run only against a new, empty volume. Regenerating
environment files does not change passwords already stored in a database.
Do not delete credentials or remove database volumes to resolve login errors.

Only start this service after the preparation output has been reviewed:

```bash
docker compose -f /opt/realweb/deploy/mongodb.compose.yml up -d mongodb
```

The existing Nginx, gost, Outline, Duckmail and Watchtower configurations are
outside this Compose project. Database backups, backend process management,
frontend routing, public DNS, HTTPS, administrator creation and mail services
are subsequent deployment stages.

## Prepare the backend service

After pulling the backend service configuration, run as root:

```bash
bash /opt/realweb/deploy/install-backend-service.sh
systemd-analyze verify /etc/systemd/system/realweb-backend.service
```

The installer creates a dedicated `realweb` system account and the website's
runtime directories, installs only `realweb-backend.service`, and reloads
systemd's unit definitions. It does not enable or start the service, replace
credentials, modify existing application data, or reload Nginx. If an unrelated
account or a different existing service file is found, it stops for inspection.

The service uses `/usr/bin/node` with `/opt/realweb/backend` as its working
directory. systemd supplies the root-only `.env` through `EnvironmentFile`; the
Node process does not need permission to read that file itself. The startup
check verifies private host/port settings, loads native dependencies, and
authenticates the application database account before starting the backend.

The production endpoint is `127.0.0.1:8000`. `/health` and `/api/health` return
503 while the application database is disconnected and 200 while connected.
The service is restricted to its designated writable directories:

- Uploads and runtime configuration: `/var/lib/realweb`.
- Backup destination: `/var/backups/realweb` (backup execution still requires
  its own deployment stage; the legacy Docker backup implementation is not
  configured by this installer).
- Existing application log, temporary download and cookie directories:
  `/opt/realweb/backend/logs`, `backend/temp`, and `backend/config`.

The email-domain JSON is copied once into
`/var/lib/realweb/config/email-domains.json` and used through
`EMAIL_DOMAINS_CONFIG`, so admin edits will not modify tracked source files.
The website process does not receive Docker or root permissions. Automatic
Postfix configuration writes are disabled in this unit; Postfix will be
restored and verified separately for the requested self-hosted sending setup.

After preparation has been reviewed, enable and start the service explicitly:

```bash
systemctl enable --now realweb-backend.service
```

This does not by itself publish the website: Nginx routing, DNS, HTTPS, the
initial administrator and mail delivery are still separate deployment steps.
