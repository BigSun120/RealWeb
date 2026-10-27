#!/usr/bin/env bash
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ $(id -u) -eq 0 && $(uname -s) == Linux ]] || fail 'Run as root on the Linux server.'
[[ $(realpath "$(dirname "$0")/..") == /opt/realweb ]] || fail 'Expected project directory /opt/realweb.'

for command in node docker flock tar gzip; do
    command -v "$command" >/dev/null || fail "Required command is missing: $command"
done
for name in realweb-backup.service realweb-backup.timer; do
    target=/etc/systemd/system/$name
    if [[ -e $target || -L $target ]]; then
        [[ -f $target && ! -L $target ]] && cmp -s "/opt/realweb/deploy/$name" "$target" ||
            fail "Preserve and inspect an existing differing unit: $target"
    else
        load_state=$(systemctl show -p LoadState --value "$name" 2>/dev/null || true)
        [[ -z $load_state || $load_state == not-found ]] || fail "An unrelated unit already exists: $name"
    fi
done

destination=/var/backups/realweb-system
if [[ -e $destination || -L $destination ]]; then
    [[ -d $destination && ! -L $destination && $(stat -c '%a:%u' "$destination") == 700:0 ]] ||
        fail 'Preserve and inspect the existing backup directory; expected root ownership and mode 700.'
else
    install -d -o root -g root -m 0700 "$destination"
fi

for name in realweb-backup.service realweb-backup.timer; do
    install -o root -g root -m 0644 "/opt/realweb/deploy/$name" "/etc/systemd/system/$name"
done
systemctl daemon-reload
printf '%s\n' 'Prepared the root-only backup directory, service and daily timer.'
printf '%s\n' 'No backup was run, and the timer has not been enabled or started.'
