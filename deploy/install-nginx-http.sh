#!/usr/bin/env bash
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ $(id -u) -eq 0 && $(uname -s) == Linux ]] || fail 'Run as root on the Linux server.'
[[ $(realpath "$(dirname "$0")/..") == /opt/realweb ]] || fail 'Expected project directory /opt/realweb.'

available=/etc/nginx/sites-available/realweb
enabled=/etc/nginx/sites-enabled/realweb
for file in "$available" "$enabled"; do
    [[ ! -e $file && ! -L $file ]] || fail "Preserve and inspect the existing file: $file"
done

nginx -t
current_config=$(nginx -T 2>&1)
if grep -E '^[[:space:]]*server_name[[:space:]]' <<< "$current_config" |
    grep -Eq '(^|[[:space:]])(www\.)?godaug\.fun([[:space:];]|$)'; then
    fail 'A godaug.fun server_name already exists; inspect it before adding another site.'
fi

runuser -u www-data -- test -r /opt/realweb/frontend/dist/index.html ||
    fail 'Nginx user www-data cannot read the built frontend index.html.'

install -o root -g root -m 0644 /opt/realweb/deploy/nginx-http.conf "$available"
if ! ln -s "$available" "$enabled"; then
    rm -- "$available"
    fail 'Could not enable the new site; removed its newly created configuration.'
fi
if ! nginx -t; then
    unlink "$enabled"
    rm -- "$available"
    fail 'Nginx validation failed; removed the newly created site. Existing sites were preserved.'
fi
printf '%s\n' 'Prepared and validated the new realweb HTTP site. Nginx has not been reloaded.'
