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
configuration. `.env` is the backend configuration; access for its eventual
service account will be configured in the backend deployment stage. SMTP
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
