#!/usr/bin/env bash
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ $(id -u) -eq 0 ]] || fail 'Run this preparation script as root.'
[[ $(uname -s) == Linux ]] || fail 'This service preparation is for Linux only.'
[[ $(realpath "$(dirname "$0")/..") == /opt/realweb ]] || fail 'Expected project directory /opt/realweb.'

project=/opt/realweb
unit=/etc/systemd/system/realweb-backend.service
source_unit=$project/deploy/realweb-backend.service
[[ -x /usr/bin/node ]] || fail 'Node.js is missing from /usr/bin/node.'
[[ -f $project/.env && ! -L $project/.env ]] || fail 'Expected a regular production .env file.'
[[ $(stat -c '%a:%u' "$project/.env") == 600:0 ]] || fail 'Keep .env owned by root with mode 600.'

if [[ -e $unit || -L $unit ]]; then
  [[ -f $unit && ! -L $unit ]] && cmp -s "$source_unit" "$unit" || fail 'An existing service file differs; preserve it and inspect before proceeding.'
else
  load_state=$(systemctl show -p LoadState --value realweb-backend.service 2>/dev/null || true)
  [[ -z $load_state || $load_state == not-found ]] || fail 'A service with this name already exists outside the expected location.'
fi

if getent passwd realweb >/dev/null; then
  [[ $(id -u realweb) -ne 0 ]] || fail 'The service account must not be root.'
  [[ $(getent passwd realweb | cut -d: -f6-7) == /opt/realweb:/usr/sbin/nologin ]] || fail 'An unrelated realweb account already exists.'
  [[ $(id -nG realweb) == realweb ]] || fail 'Inspect existing supplementary groups for realweb before proceeding.'
else
  useradd --system --user-group --home-dir /opt/realweb --no-create-home --shell /usr/sbin/nologin realweb
fi

directories=(
  /var/lib/realweb /var/lib/realweb/uploads /var/lib/realweb/config
  /var/backups/realweb
  "$project/backend/logs" "$project/backend/temp" "$project/backend/config"
)
for directory in "${directories[@]}"; do
  [[ ! -L $directory ]] || fail "Refusing a symlink at $directory."
  [[ ! -e $directory || -d $directory ]] || fail "Expected a directory at $directory."
  if [[ -d $directory ]]; then
    owner=$(stat -c '%U' "$directory")
    [[ $owner == root || $owner == realweb ]] || fail "An unrelated owner exists at $directory."
  fi
done
install -d -o realweb -g realweb -m 0750 "${directories[@]}"

domain_config=/var/lib/realweb/config/email-domains.json
if [[ -e $domain_config || -L $domain_config ]]; then
  [[ -f $domain_config && ! -L $domain_config ]] || fail 'Preserve and inspect the existing runtime domain configuration.'
else
  install -o realweb -g realweb -m 0640 "$project/backend/src/config/email-domains.json" "$domain_config"
fi

install -o root -g root -m 0644 "$source_unit" "$unit"
systemctl daemon-reload
printf '%s\n' 'Prepared realweb user, runtime directories and realweb-backend.service.'
printf '%s\n' 'The service has not been enabled or started. Root-only .env contents were preserved.'
