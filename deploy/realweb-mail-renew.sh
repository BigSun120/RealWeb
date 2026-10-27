#!/bin/sh
# Managed by RealWeb mail deployment
set -eu

if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/realweb-mail ]; then
    if /usr/sbin/postfix status >/dev/null 2>&1; then
        /usr/sbin/postfix reload
    fi
fi
