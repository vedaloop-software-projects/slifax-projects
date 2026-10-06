import {generatePDF} from 'react-native-html-to-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import {Platform, Alert, ToastAndroid} from 'react-native';

const safeShare = async (url, type, fileName) => {
  try {
    if (!Share || typeof Share.open !== 'function') {
      console.warn('Share module not available');
      Alert.alert('Saved', `File saved at:\n${url}`);
      return;
    }
    await Share.open({
      title: `Export ${fileName}`,
      url,
      type,
      filename: fileName,
      failOnCancel: false,
      showAppsToView: true,
    });
  } catch (e) {
    console.log('Share cancelled or failed:', e?.message);
  }
};

const saveToAndroidDownloads = async (sourcePath, fileName, mimeType) => {
  if (Platform.Version >= 29 && ReactNativeBlobUtil.MediaCollection) {
    const contentUri =
      await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
        {name: fileName, parentFolder: '', mimeType},
        'Download',
        sourcePath,
      );
    if (!contentUri) {
      throw new Error('Android did not return a Downloads file URI.');
    }
    return contentUri;
  }
  const downloadDir =
    ReactNativeBlobUtil.fs.dirs.DownloadDir || '/storage/emulated/0/Download';
  const downloadPath = `${downloadDir}/${fileName}`;
  if (await ReactNativeBlobUtil.fs.exists(downloadPath)) {
    await ReactNativeBlobUtil.fs.unlink(downloadPath);
  }
  await ReactNativeBlobUtil.fs.cp(sourcePath, downloadPath);
  await ReactNativeBlobUtil.fs.scanFile([{path: downloadPath, mime: mimeType}]);
  if (!(await ReactNativeBlobUtil.fs.exists(downloadPath))) {
    throw new Error(`File was not found after saving:\n${downloadPath}`);
  }
  return downloadPath;
}
const getShareUrl = path =>
  path.startsWith('content://') ? path : `file://${path}`;

const getDownloadDir = () => {
  if (Platform.OS === 'android') {
    return ReactNativeBlobUtil.fs.dirs.DownloadDir;
  }
  return ReactNativeBlobUtil.fs.dirs.DocumentDir;
};

const stringifyCell = raw => {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
};

const escapeCSVCell = (raw, columnName = '') => {
  let value = stringifyCell(raw);
  if (columnName === 'Audit Date' && value) {
    value = `\t${value}`;
  }
  value = value.replace(/"/g, '""');
  if (
    value.includes(',') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value.includes('"')
  ) {
    value = `"${value}"`;
  }
  return value;
};

const escapeHTML = raw => {
  const value = stringifyCell(raw);
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const showSuccessToast = message => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('Success', message);
  }
};

const normalizeMetaRows = metaRows => {
  if (!Array.isArray(metaRows)) return [];
  return metaRows.filter(
    r =>
      r &&
      r.label &&
      r.value !== undefined &&
      r.value !== null &&
      String(r.value).trim() !== '',
  );
};

const chunkIntoPairs = rows => {
  const pairs = [];
  for (let i = 0; i < rows.length; i += 2) {
    pairs.push([rows[i], rows[i + 1] || null]);
  }
  return pairs;
};
export const exportToCSV = async (
  data,
  headers = null,
  fileName = 'audit_log',
  companyName = '',
  title = 'Audit Log Report',
  metaRows = [],
) => {
  try {
    if (!data || data.length === 0) {
      Alert.alert('No Data', 'There is nothing to export.');
      return null;
    }

    const cols = headers || Object.keys(data[0]);
    const rows = data.map(item =>
      cols.map(col => escapeCSVCell(item[col], col)).join(','),
    );

    const cleanMeta = normalizeMetaRows(metaRows);
    const metaLines = cleanMeta.map(
      r => `${escapeCSVCell(r.label)},${escapeCSVCell(r.value)}`,
    );

    const csvHeaderRows = [
      [companyName || 'Company Name'],
      [title],
      [`Generated on ${new Date().toLocaleString()}`],
      ...(metaLines.length > 0 ? [[], ...metaLines.map(line => [line])] : []),
      [],
      cols,
    ];

    const csvString =
      '\uFEFF' +
      [
        ...csvHeaderRows.map(row => row.map(escapeCSVCell).join(',')),
        ...rows,
      ].join('\r\n');

    const downloadDir = getDownloadDir();
    if (!downloadDir) throw new Error('Download directory not available.');

    const safeFileName = String(fileName || 'export')
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_');

    const path =
      Platform.OS === 'android'
        ? `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${safeFileName}.csv`
        : `${downloadDir}/${safeFileName}.csv`;

    const alreadyExists = await ReactNativeBlobUtil.fs.exists(path);
    if (alreadyExists) await ReactNativeBlobUtil.fs.unlink(path);

    await ReactNativeBlobUtil.fs.writeFile(path, csvString, 'utf8');

    const csvExists = await ReactNativeBlobUtil.fs.exists(path);
    if (!csvExists) throw new Error(`CSV was not found after saving:\n${path}`);

    const savedPath =
      Platform.OS === 'android'
        ? await saveToAndroidDownloads(path, `${safeFileName}.csv`, 'text/csv')
        : path;

    if (Platform.OS === 'android' && savedPath !== path) {
      await ReactNativeBlobUtil.fs.unlink(path);
    }

    showSuccessToast('CSV exported successfully to Downloads');
    await safeShare(getShareUrl(savedPath), 'text/csv', `${safeFileName}.csv`);

    return savedPath;
  } catch (error) {
    console.error('CSV EXPORT ERROR', error);
    Alert.alert('Export Failed', error?.message || 'Could not export CSV.');
    return null;
  }
};

export const exportToPDF = async (
  data,
  headers = null,
  fileName = 'audit_log',
  title = 'Audit Log Report',
  companyName = '',
  metaRows = [],
) => {
  try {
    if (!data || data.length === 0) {
      Alert.alert('No Data', 'There is nothing to export.');
      return null;
    }

    const cols = headers || Object.keys(data[0]);

    const tableRows = data
      .map(
        item => `
          <tr>
            ${cols.map(column => `<td>${escapeHTML(item[column])}</td>`).join('')}
          </tr>
        `,
      )
      .join('');

    // ---------- META ROWS AS TABLE (2 columns) ----------
    const cleanMeta = normalizeMetaRows(metaRows);
    const metaPairs = chunkIntoPairs(cleanMeta);

    const metaHtml = cleanMeta.length
      ? `
        <table class="meta-table">
          <tbody>
            ${metaPairs
              .map(
                ([left, right]) => `
                  <tr>
                    <td class="meta-label">${escapeHTML(left.label)}</td>
                    <td class="meta-colon">:</td>
                    <td class="meta-value">${escapeHTML(left.value)}</td>
                    <td class="meta-label">${
                      right ? escapeHTML(right.label) : ''
                    }</td>
                    <td class="meta-colon">${right ? ':' : ''}</td>
                    <td class="meta-value">${
                      right ? escapeHTML(right.value) : ''
                    }</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 landscape; margin: 18px; }
            * { box-sizing: border-box; }

            body {
              font-family: Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #222;
              background: #fff;
            }

            .header {
              width: 100%;
              padding-bottom: 12px;
              border-bottom: 2px solid #264B79;
              margin-bottom: 12px;
            }

            .title {
              color: #264B79;
              font-size: 21px;
              font-weight: bold;
              text-align: center;
              margin: 0 0 5px 0;
            }

            .company {
              color: #1B1B1B;
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              margin: 0 0 6px 0;
            }

            .generated {
              text-align: center;
              color: #777;
              font-size: 9px;
              margin: 0;
            }

            /* ---------- META TABLE ---------- */
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0 14px 0;
              border: 1px solid #D7DEE8;
              background: #F7F9FC;
            }

            .meta-table td {
              padding: 5px 8px;
              font-size: 9px;
              vertical-align: top;
              border: none;
              word-break: break-word;
            }

            .meta-table .meta-label {
              width: 14%;
              color: #555;
              font-weight: bold;
            }

            .meta-table .meta-colon {
              width: 2%;
              color: #555;
            }

            .meta-table .meta-value {
              width: 34%;
              color: #222;
            }

            /* ---------- DATA TABLE ---------- */
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-top: 5px;
            }

            table.data-table thead {
              display: table-header-group;
            }

            table.data-table tr {
              page-break-inside: avoid;
            }

            table.data-table th {
              background-color: #264B79;
              color: #fff;
              border: 1px solid #264B79;
              padding: 7px 6px;
              font-size: 9px;
              font-weight: bold;
              text-align: left;
              vertical-align: middle;
            }

            table.data-table td {
              border: 1px solid #D9DEE5;
              padding: 6px;
              font-size: 8.5px;
              color: #333;
              text-align: left;
              vertical-align: top;
              word-wrap: break-word;
            }

            table.data-table tbody tr:nth-child(even) td {
              background-color: #F8FAFC;
            }

            table.data-table tbody tr:nth-child(odd) td {
              background-color: #FFFFFF;
            }

            .footer {
              margin-top: 12px;
              padding-top: 7px;
              border-top: 1px solid #D9DEE5;
              text-align: center;
              color: #777;
              font-size: 8px;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="company">
              ${escapeHTML(companyName || 'Company Name')}
            </div>
            <div class="title">${escapeHTML(title)}</div>
            <div class="generated">
              Generated on ${escapeHTML(new Date().toLocaleString())}
            </div>
          </div>

          ${metaHtml}

          <table class="data-table">
            <thead>
              <tr>
                ${cols.map(column => `<th>${escapeHTML(column)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div class="footer">Total Records: ${data.length}</div>
        </body>
      </html>
    `;

    const options = {html, fileName, directory: 'Documents'};

    const file = await generatePDF(options);
    if (!file || !file.filePath) {
      throw new Error('PDF generation failed — filePath missing.');
    }

    if (Platform.OS === 'android') {
      const safeFileName = String(fileName)
        .replace(/[<>:"/\\|?*]/g, '_')
        .trim();

      const downloadPath = await saveToAndroidDownloads(
        file.filePath,
        `${safeFileName}.pdf`,
        'application/pdf',
      );

      ToastAndroid.show(
        'PDF exported successfully to Downloads',
        ToastAndroid.LONG,
      );

      await safeShare(
        getShareUrl(downloadPath),
        'application/pdf',
        `${safeFileName}.pdf`,
      );

      return downloadPath;
    }

    await safeShare(
      `file://${file.filePath}`,
      'application/pdf',
      `${fileName}.pdf`,
    );

    return file.filePath;
  } catch (error) {
    console.error('PDF EXPORT ERROR', error);
    Alert.alert('Export Failed', error?.message || 'Could not export PDF.');
    return null;
  }
};