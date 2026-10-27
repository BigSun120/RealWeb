const crypto = require('node:crypto');
const { isIP } = require('node:net');

const MARKER = '# Managed by RealWeb mail deployment';
const KEY_FILE = '/etc/opendkim/keys/godaug.fun/realweb.private';

function relayDomains(domains) {
  if (!Array.isArray(domains) || domains.length > 100) throw new Error('Expected a temporary-mail domain array');
  const result = new Set(['godaug.fun', 'temp.godaug.fun']);
  const local = new Set(['mail.godaug.fun', 'localhost.godaug.fun', 'localhost']);
  for (const value of domains) {
    if (typeof value !== 'string') throw new Error('Mail domains must be strings');
    const domain = value.trim().toLowerCase();
    const labels = domain.split('.');
    if (domain.length > 253 || labels.length < 2 || isIP(domain) || local.has(domain) ||
        !labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
      throw new Error('Invalid temporary-mail domain; use literal DNS names without wildcards or configuration directives');
    }
    result.add(domain);
  }
  return [...result].sort();
}

function postfixMain(domains, databaseType = 'hash') {
  if (!['hash', 'lmdb', 'cdb'].includes(databaseType)) throw new Error('Unsupported map database type');
  const allowed = relayDomains(domains);
  const values = {
    compatibility_level: '3.10', myhostname: 'mail.godaug.fun', mydomain: 'godaug.fun',
    myorigin: '$mydomain', smtp_helo_name: '$myhostname', smtpd_banner: '$myhostname ESMTP',
    inet_interfaces: 'all', inet_protocols: 'ipv4', mynetworks: '127.0.0.1/32',
    mydestination: '$myhostname, localhost.$mydomain, localhost',
    parent_domain_matches_subdomains: '', relay_domains: allowed.join(', '), relay_recipient_maps: '',
    transport_maps: `${databaseType}:/etc/postfix/realweb-transport`, relayhost: '',
    default_database_type: databaseType, alias_maps: `${databaseType}:/etc/aliases`,
    alias_database: `${databaseType}:/etc/aliases`,
    smtpd_relay_restrictions: 'permit_mynetworks, reject_unauth_destination',
    smtpd_sasl_auth_enable: 'no', disable_vrfy_command: 'yes', message_size_limit: '10240000',
    smtpd_tls_security_level: 'may', smtp_tls_security_level: 'may',
    smtpd_tls_cert_file: '/etc/letsencrypt/live/realweb-mail/fullchain.pem',
    smtpd_tls_key_file: '/etc/letsencrypt/live/realweb-mail/privkey.pem',
    smtp_tls_CApath: '/etc/ssl/certs', smtpd_tls_loglevel: '1',
    milter_protocol: '6', milter_default_action: 'tempfail',
    smtpd_milters: 'inet:127.0.0.1:8891', non_smtpd_milters: 'inet:127.0.0.1:8891'
  };
  return MARKER + '\n' + Object.entries(values).map(([key, value]) => `${key} = ${value}`).join('\n') + '\n';
}

function transportMap(domains) {
  return relayDomains(domains).map(domain => `${domain} smtp:[127.0.0.1]:2500`).join('\n') + '\n';
}

function openDkimConfig() {
  return `${MARKER}
Syslog                  yes
SyslogSuccess           yes
UserID                  opendkim:opendkim
UMask                   007
PidFile                 /run/opendkim/opendkim.pid
Socket                  inet:8891@127.0.0.1
Mode                    sv
Canonicalization        relaxed/simple
SignatureAlgorithm      rsa-sha256
OversignHeaders         From
Domain                  godaug.fun
Selector                realweb
KeyFile                 ${KEY_FILE}
InternalHosts           127.0.0.1
AuthservID              mail.godaug.fun
`;
}

function publicDkimRecord(privateKey) {
  const key = crypto.createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) {
    throw new Error('Preserve and inspect the existing DKIM key; expected RSA with at least 2048 bits');
  }
  const publicKey = crypto.createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64');
  return `v=DKIM1; k=rsa; p=${publicKey}`;
}

module.exports = { MARKER, KEY_FILE, relayDomains, postfixMain, transportMap, openDkimConfig, publicDkimRecord };
