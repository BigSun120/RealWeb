/**
 * 简易 CSV 解析与生成工具
 * 避免额外依赖，支持基础引号与换行处理
 */

const sanitizeBOM = content => {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
};

const parseCsvRows = content => {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(current);
    current = '';
  };

  const pushRow = () => {
    // 去除完全空白的记录
    if (row.some(cell => cell.trim() !== '')) {
      rows.push(row.map(cell => cell.trim()));
    }
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushField();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      pushField();
      pushRow();
      if (char === '\r' && nextChar === '\n') {
        i += 1; // skip \n in CRLF
      }
    } else {
      current += char;
    }
  }

  // push last field/row
  if (current !== '' || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
};

const parseCsv = (input, { withHeader = true } = {}) => {
  if (!input) return [];
  const content = sanitizeBOM(input.toString('utf8'));
  const rows = parseCsvRows(content);
  if (!withHeader) {
    return rows;
  }
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0].map(header => header.trim());
  return rows.slice(1).map(row => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] !== undefined ? row[index] : '';
    });
    return record;
  });
};

const escapeCsvField = value => {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const stringifyCsv = (records, headers) => {
  if (!Array.isArray(records)) {
    return '';
  }
  const resolvedHeaders = headers && headers.length > 0
    ? headers
    : records.length > 0
      ? Object.keys(records[0])
      : [];

  const lines = [];
  if (resolvedHeaders.length > 0) {
    lines.push(resolvedHeaders.map(escapeCsvField).join(','));
  }
  for (const record of records) {
    const line = resolvedHeaders.map(header => escapeCsvField(record[header]));
    lines.push(line.join(','));
  }
  return lines.join('\r\n');
};

module.exports = {
  parseCsv,
  stringifyCsv
};

