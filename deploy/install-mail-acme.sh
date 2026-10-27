#!/usr/bin/env bash
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ $(id -u) -eq 0 && $(uname -s) == Linux ]] || fail 'Run as root on the Linux server.'
[[ $(realpath "$(dirname "$0")/..") == /opt/realweb ]] || fail 'Expected project directory /opt/realweb.'

available=/etc/nginx/sites-available/realweb-mail-acme
enabled=/etc/nginx/sites-enabled/realweb-mail-acme
for file in "$available" "$enabled"; do
    [[ ! -e $file && ! -L $file ]] || fail "Preserve and inspect an existing file: $file"
done
nginx -t
current_config=$(nginx -T 2>&1)
if grep -E '^[[:space:]]*server_name[[:space:]]' <<< "$current_config" |
    grep -Eq '(^|[[:space:]])mail\.godaug\.fun([[:space:];]|$)'; then
    fail 'An existing mail.godaug.fun site needs inspection before proceeding.'
fi

webroot=/var/lib/letsencrypt-realweb
for directory in "$webroot" "$webroot/.well-known" "$webroot/.well-known/acme-challenge"; do
    [[ ! -L $directory ]] || fail "Refusing a symlink: $directory"
    if [[ -e $directory ]]; then
        [[ -d $directory && $(stat -c '%u' "$directory") == 0 ]] || fail "Inspect an unrelated path: $directory"
    fi
done
install -d -o root -g root -m 0755 "$webroot" "$webroot/.well-known" "$webroot/.well-known/acme-challenge"
install -o root -g root -m 0644 /opt/realweb/deploy/nginx-mail-acme.conf "$available"
if ! ln -s "$available" "$enabled"; then
    rm -- "$available"
    fail 'Could not enable the challenge site; removed its newly created configuration.'
fi
if ! nginx -t; then
    unlink "$enabled"
    rm -- "$available"
    fail 'Nginx validation failed; removed only the newly created challenge site.'
fi
printf '%s\n' 'Prepared and validated the mail certificate challenge site. Nginx has not been reloaded.'
