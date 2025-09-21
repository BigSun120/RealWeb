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
  // images ![alt](url) — handle before links
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
    const safeUrl = sanitizeUrl(url);
    // alt 已在前面 escape 过，这里再次 escape 以确保属性安全（可能会双转义特殊字符，但不影响显示）
    return `<img src="${safeUrl}" alt="${escapeHtml(alt)}" loading="lazy">`;
  });
  // bold and italic (handle bold first)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
    const safeUrl = sanitizeUrl(url);
    // 如果链接目标是图片，则直接渲染为 <img>
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(safeUrl)) {
      return `<img src="${safeUrl}" alt="${escapeHtml(text)}" loading="lazy">`;
    }
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

