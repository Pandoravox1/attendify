const CSV_IMPORT_LIMITS = {
  maxFileSize: 5 * 1024 * 1024,
  maxRows: 5000,
  maxCols: 60,
  maxCellChars: 500,
};

const CSV_ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]);

const DANGEROUS_HEADER_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const validateCsvFile = (file, limits = CSV_IMPORT_LIMITS) => {
  if (!file) {
    return { ok: false, message: 'Please select a .csv file first.' };
  }
  const name = String(file.name || '').toLowerCase();
  const hasCsvExt = name.endsWith('.csv');
  const mime = String(file.type || '');
  const hasValidMime = !mime || CSV_ALLOWED_MIME_TYPES.has(mime);
  if (!hasCsvExt || !hasValidMime) {
    return { ok: false, message: 'File format must be .csv.' };
  }
  if (typeof file.size === 'number' && file.size > limits.maxFileSize) {
    return {
      ok: false,
      message: `File size is too large (max ${formatBytes(limits.maxFileSize)}).`,
    };
  }
  return { ok: true };
};

const sanitizeHeaderCell = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (DANGEROUS_HEADER_KEYS.has(lower)) return '';
  return trimmed;
};

const sanitizeHeaderRow = (row) => {
  if (!Array.isArray(row)) return [];
  return row.map(sanitizeHeaderCell);
};

const enforceSheetLimits = (rows, limits = CSV_IMPORT_LIMITS) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: 'File is empty.' };
  }
  if (rows.length > limits.maxRows) {
    return { ok: false, message: `Too many rows (max ${limits.maxRows}).` };
  }
  for (let i = 0; i < rows.length; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    if (row.length > limits.maxCols) {
      return { ok: false, message: `Too many columns (max ${limits.maxCols}).` };
    }
    for (let j = 0; j < row.length; j += 1) {
      const cell = row[j];
      if (typeof cell === 'string' && cell.length > limits.maxCellChars) {
        return {
          ok: false,
          message: `Cell content is too long (max ${limits.maxCellChars} characters).`,
        };
      }
    }
  }
  return { ok: true };
};

const normalizeNewlines = (text) => (
  text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
);

const stripBom = (text) => (
  text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
);

const detectDelimiter = (text) => {
  const sample = text.split('\n').slice(0, 5).join('\n');
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

const parseCsvText = (text, delimiter) => {
  if (!text) return [];
  const normalized = normalizeNewlines(stripBom(text));
  const activeDelimiter = delimiter || detectDelimiter(normalized);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === activeDelimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  row.push(field);
  const hasData = row.some((cell) => String(cell || '').trim());
  if (hasData || rows.length === 0) {
    rows.push(row);
  }

  return rows;
};

const escapeCsvCell = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/["\n\r,]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const stringifyCsv = (rows, delimiter = ',') => (
  (rows || []).map((row) => (
    (Array.isArray(row) ? row : [row])
      .map(escapeCsvCell)
      .join(delimiter)
  )).join('\r\n')
);

const downloadCsv = (rows, filename) => {
  const csv = stringifyCsv(rows);
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export {
  CSV_IMPORT_LIMITS,
  validateCsvFile,
  sanitizeHeaderCell,
  sanitizeHeaderRow,
  enforceSheetLimits,
  parseCsvText,
  stringifyCsv,
  downloadCsv,
};
