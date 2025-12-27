const XLSX_IMPORT_LIMITS = {
  maxFileSize: 5 * 1024 * 1024,
  maxRows: 5000,
  maxCols: 60,
  maxCellChars: 500,
};

const XLSX_ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

const DANGEROUS_HEADER_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const validateXlsxFile = (file, limits = XLSX_IMPORT_LIMITS) => {
  if (!file) {
    return { ok: false, message: 'Please select an .xlsx file first.' };
  }
  const name = String(file.name || '').toLowerCase();
  const hasXlsxExt = name.endsWith('.xlsx');
  const mime = String(file.type || '');
  const hasValidMime = !mime || XLSX_ALLOWED_MIME_TYPES.has(mime);
  if (!hasXlsxExt || !hasValidMime) {
    return { ok: false, message: 'File format must be .xlsx.' };
  }
  if (typeof file.size === 'number' && file.size > limits.maxFileSize) {
    return {
      ok: false,
      message: `File size is too large (max ${formatBytes(limits.maxFileSize)}).`,
    };
  }
  return { ok: true };
};

const getSafeXlsxReadOptions = (limits = XLSX_IMPORT_LIMITS) => ({
  type: 'array',
  dense: true,
  cellFormula: false,
  cellHTML: false,
  cellNF: false,
  cellStyles: false,
  bookVBA: false,
  bookProps: false,
  bookFiles: false,
  sheetRows: limits.maxRows + 1,
});

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

const enforceSheetLimits = (rows, limits = XLSX_IMPORT_LIMITS) => {
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

export {
  XLSX_IMPORT_LIMITS,
  validateXlsxFile,
  getSafeXlsxReadOptions,
  sanitizeHeaderCell,
  sanitizeHeaderRow,
  enforceSheetLimits,
};
