// Minimal Markdown -> Safe HTML renderer with strict sanitization (no external deps)
// Supports: paragraphs, line breaks, **bold**, *italic*, `code`, links [text](url), unordered lists

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url = '') {
  const trimmed = String(url).trim();
  // Allow http, https, mailto, and root/relative links; block javascript: etc.
  if (/^(https?:|mailto:|\/)/i.test(trimmed)) return trimmed;
  return '#';
}

function renderInline(md = '') {
  // code
  let html = escapeHtml(md);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold and italic (handle bold first)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
  });
  return html;
}

function renderList(lines) {
  const items = lines.map(line => {
    const content = line.replace(/^[-*]\s+/, '');
    return `<li>${renderInline(content)}</li>`;
  }).join('');
  return `<ul>${items}</ul>`;
}

function markdownToSafeHtml(md = '') {
  if (!md) return '';
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');

  const out = [];
  let buffer = [];
  let listBuffer = [];

  const flushParagraph = () => {
    if (buffer.length) {
      const text = buffer.join(' ');
      out.push(`<p>${renderInline(text)}</p>`);
      buffer = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length) {
      out.push(renderList(listBuffer));
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listBuffer.push(line);
    } else {
      flushList();
      buffer.push(line);
    }
  }
  flushList();
  flushParagraph();

  return out.join('\n');
}

module.exports = {
  escapeHtml,
  markdownToSafeHtml
};

