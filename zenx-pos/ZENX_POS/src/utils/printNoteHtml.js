// utils/printNoteHtml.js
import { fmtNum, fmtInt } from './formatNumber';

const NOTE_TITLES = {
  IN: 'Transfer-IN NOTE',
  OUT: 'Transfer-OUT NOTE',
  ADJUSTMENT: 'STOCK ADJUSTMENT NOTE',
};

export const getNoteTitle = (noteType) =>
  NOTE_TITLES[noteType] || NOTE_TITLES.OUT;

/**
 * Builds the full HTML string for printing the note.
 *
 * @param {object} args
 * @param {object[]} args.items
 * @param {'IN' | 'OUT' | 'ADJUSTMENT'} args.noteType
 * @param {{label: string, value: string}[]} args.metaRows
 * @param {object} args.profile
 * @param {object} args.user
 * @returns {string}
 */
export const buildPrintHtml = ({ items, noteType, metaRows, profile, user }) => {
  const isTransferIn = noteType === 'IN';
  const noteTitle = getNoteTitle(noteType);

  const companyName = profile?.businessName || user?.businessName;
  const fullAddress = [
    profile?.address || user?.address,
    profile?.city || user?.city,
  ]
    .filter(Boolean)
    .join(', ');
  const userMobile = profile?.mobile || user?.mobile;
  const gstNo = profile?.gstNumber;

  const remarksText =
    metaRows?.find((r) => r.label === 'Remarks')?.value || '';

  const metaPairs = [];
  for (let i = 0; i < metaRows.length; i += 2) {
    metaPairs.push([metaRows[i], metaRows[i + 1] || null]);
  }

  const metaTableHtml = metaRows.length
    ? `
      <table class="meta-table">
        <tbody>
          ${metaPairs
            .map(
              ([left, right]) => `
            <tr>
              <td class="meta-label">${left.label}</td>
              <td class="meta-colon">:</td>
              <td class="meta-value">${left.value}</td>
              <td class="meta-label">${right ? right.label : ''}</td>
              <td class="meta-colon">${right ? ':' : ''}</td>
              <td class="meta-value">${right ? right.value : ''}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `
    : '';

  const totalItems = items.length;
  const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const totalFree = items.reduce((s, i) => s + (Number(i.free) || 0), 0);
  const totalAmt = items
    .reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)
    .toFixed(2);

  const tableHeaders = `<th>S.No</th><th>Product Code</th><th>Product Name</th><th>Variant Code</th><th>EAN Code</th><th class="text-right">MRP</th><th class="text-right">Cost Price</th><th class="text-center">Qty</th>${isTransferIn ? '<th class="text-center">Free</th>' : ''}<th class="text-right">Amount</th>`;

  const tableRows = items
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.itemCode || ''}</td>
      <td>${item.itemName || ''}</td>
      <td>${item.variantCode || ''}</td>
      <td>${item.eanCode || ''}</td>
      <td class="text-right">${fmtNum(item.mrp)}</td>
      <td class="text-right">${fmtNum(item.costPrice)}</td>
      <td class="text-center">${fmtInt(item.qty)}</td>
      ${isTransferIn ? `<td class="text-center">${fmtInt(item.free)}</td>` : ''}
      <td class="text-right">${fmtNum(item.totalAmount)}</td>
    </tr>
  `,
    )
    .join('');

  const totalRow = `<td colspan="5" class="text-right">ITEMS: ${totalItems}</td><td class="text-right"></td><td class="text-right"></td><td class="text-center">${fmtInt(totalQty)}</td>${isTransferIn ? `<td class="text-center">${fmtInt(totalFree)}</td>` : ''}<td class="text-right">₹${fmtNum(totalAmt)}</td>`;

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 2px 0; font-size: 12px; }
          .header .gst { font-weight: bold; font-size: 13px; margin-top: 5px; }
          .thick-divider { border-bottom: 2px solid #000; margin: 10px 0; }
          .thin-divider { border-bottom: 1px solid #000; margin: 8px 0; }
          .note-title { text-align: center; font-weight: bold; font-size: 14px; margin: 5px 0; }
          .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0 20px 0; border: 1px solid #ddd; background: #F7F9FC; }
          .meta-table td { padding: 5px 8px; font-size: 11px; vertical-align: top; border: none; word-break: break-word; }
          .meta-table .meta-label { width: 14%; font-weight: bold; color: #555; }
          .meta-table .meta-colon { width: 2%; color: #555; }
          .meta-table .meta-value { width: 34%; color: #000; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table th, .table td { border: 1px solid #ddd; padding: 6px; font-size: 11px; text-align: left; }
          .table th { background-color: #F5F5F5; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals-row { background-color: #F9F9F9; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; }
          .footer-right { text-align: right; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${companyName ? `<h1>${companyName.toUpperCase()}</h1>` : ''}
          ${
            fullAddress || userMobile
              ? `<p>${fullAddress || ''}${fullAddress && userMobile ? ' &nbsp;|&nbsp; ' : ''}${userMobile ? `Contact: ${userMobile}` : ''}</p>`
              : ''
          }
          ${gstNo ? `<p class="gst">GST.NO: ${gstNo}</p>` : ''}
        </div>
        <div class="thick-divider"></div>
        <div class="note-title">${noteTitle}</div>
        <div class="thin-divider"></div>

        ${metaTableHtml}

        <table class="table">
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>
            ${tableRows}
            <tr class="totals-row">${totalRow}</tr>
          </tbody>
        </table>

        <div class="footer">
          <div>${remarksText ? `<p><b>REMARKS</b></p><p>${remarksText}</p>` : ''}</div>
          <div class="footer-right">
            ${companyName ? `<p>For: ${companyName}</p>` : ''}
            <br/><br/>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </body>
    </html>
  `;
};