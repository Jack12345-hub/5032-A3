// D:/5032/A3/src/utils/export.js

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  // If the value contains commas, quotes, or newlines, wrap it in double quotes and escape internal quotes
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ✅ Named export
export function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    console.warn('No data to export');
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','), // Header row
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.setAttribute('aria-label', `Download ${filename}`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
