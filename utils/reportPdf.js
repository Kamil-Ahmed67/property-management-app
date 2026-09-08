import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// Reads the company logo off disk and inlines it as a data URI. WebView
// printing can't resolve bundled asset paths, so the image has to travel
// inside the HTML itself. Returns null on failure — the report renders
// fine without a logo, so this never blocks the download.
async function loadLogoDataUri() {
  try {
    const asset = Asset.fromModule(require('../assets/images/logo.png'));
    await asset.downloadAsync();
    if (!asset.localUri) return null;

    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.log('Logo could not be embedded in the report:', err.message);
    return null;
  }
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Strips characters that are illegal in filenames so the period label can
// be used as-is in the shared file's name.
function toSafeFileName(label) {
  return String(label)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/**
 * Builds a plain, print-oriented report: black text on white, hairline
 * rules, no fills or accent colours. Everything is laid out in points and
 * a serif-free stack so it prints consistently rather than mimicking the
 * app's on-screen styling.
 *
 * The header lives inside a <thead> of an outer wrapper table so that it
 * repeats automatically on every page the print engine breaks the report
 * into. position:fixed does NOT work for this — HTML-to-PDF renderers lay
 * the whole document out as one continuous canvas, so a fixed header would
 * only ever appear once, at the very top. A <thead> row on a table that
 * spans multiple pages is the only cross-platform (iOS + Android) trick
 * that expo-print's underlying engines honour.
 */
export function buildReportHtml({
  logoDataUri,
  companyName,
  preparedFor,
  title,
  periodLabel,
  generatedOn,
  labels,
  summaryRows,
  monthlyRows,
  expenseRows,
  totals,
}) {
  const summaryHtml = summaryRows
    .map(
      (row) => `
      <tr>
        <td class="label">${escapeHtml(row.label)}</td>
        <td class="value num">${escapeHtml(row.value)}</td>
      </tr>`
    )
    .join('');

  const monthlyHtml = monthlyRows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.month)}</td>
        <td class="num">${escapeHtml(row.income)}</td>
        <td class="num">${escapeHtml(row.expense)}</td>
        <td class="num">${escapeHtml(row.net)}</td>
      </tr>`
    )
    .join('');

  const expenseHtml = expenseRows.length
    ? expenseRows
        .map(
          (row) => `
      <tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(row.category)}</td>
        <td class="num">${escapeHtml(row.amount)}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="empty">${escapeHtml(labels.noData)}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 36pt 34pt 44pt 34pt; }

  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #111111;
    font-size: 9.5pt;
    line-height: 1.45;
    margin: 0;
  }

  /* Outer wrapper table — its <thead> is what repeats on every page. */
  table.page {
    width: 100%;
    border-collapse: collapse;
  }
  table.page > thead > tr > td,
  table.page > tbody > tr > td {
    padding: 0;
    border: none;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 1.2pt solid #111111;
    padding-bottom: 12pt;
    margin-bottom: 18pt;
  }
  .brand { display: flex; align-items: center; gap: 10pt; }
  .brand img { width: 34pt; height: 34pt; object-fit: contain; }
  .brand-name { font-size: 13pt; font-weight: 700; letter-spacing: 0.2pt; }
  .brand-sub { font-size: 8pt; color: #555555; margin-top: 1pt; }

  .meta { text-align: right; font-size: 8pt; color: #555555; }
  .meta strong { display: block; font-size: 11pt; color: #111111; font-weight: 700; margin-bottom: 3pt; }
  .meta span { display: block; }

  h2 {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7pt;
    color: #111111;
    margin: 20pt 0 7pt 0;
    padding-bottom: 4pt;
    border-bottom: 0.6pt solid #cccccc;
  }
  h2:first-of-type { margin-top: 0; }

  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4pt;
    color: #444444;
    padding: 5pt 6pt;
    border-bottom: 0.8pt solid #999999;
  }
  td {
    padding: 5pt 6pt;
    border-bottom: 0.4pt solid #e0e0e0;
    vertical-align: top;
  }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }

  /* Summary reads as a definition list rather than a data grid. */
  .summary td { border-bottom: 0.4pt solid #e0e0e0; }
  .summary td.label { color: #444444; width: 62%; }
  .summary td.value { font-weight: 700; }
  .summary tr:last-child td {
    border-top: 0.8pt solid #999999;
    border-bottom: 1.2pt solid #111111;
    font-weight: 700;
  }

  tfoot td {
    border-top: 0.8pt solid #999999;
    border-bottom: 1.2pt solid #111111;
    font-weight: 700;
  }

  .empty { text-align: center; color: #777777; padding: 14pt 6pt; }

  .footer {
    margin-top: 22pt;
    padding-top: 8pt;
    border-top: 0.4pt solid #cccccc;
    font-size: 7.5pt;
    color: #777777;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

  <table class="page">
    <thead>
      <tr>
        <td>
          <div class="header">
            <div class="brand">
              ${logoDataUri ? `<img src="${logoDataUri}" alt="" />` : ''}
              <div>
                <div class="brand-name">${escapeHtml(companyName)}</div>
                <div class="brand-sub">${escapeHtml(labels.preparedFor)}: ${escapeHtml(preparedFor)}</div>
              </div>
            </div>
            <div class="meta">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(labels.period)}: ${escapeHtml(periodLabel)}</span>
              <span>${escapeHtml(labels.generatedOn)}: ${escapeHtml(generatedOn)}</span>
            </div>
          </div>
        </td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>

          <h2>${escapeHtml(labels.summary)}</h2>
          <table class="summary">
            <tbody>${summaryHtml}</tbody>
          </table>

          <h2>${escapeHtml(labels.monthlyBreakdown)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(labels.month)}</th>
                <th class="num">${escapeHtml(labels.income)}</th>
                <th class="num">${escapeHtml(labels.expense)}</th>
                <th class="num">${escapeHtml(labels.net)}</th>
              </tr>
            </thead>
            <tbody>${monthlyHtml}</tbody>
            <tfoot>
              <tr>
                <td>${escapeHtml(labels.total)}</td>
                <td class="num">${escapeHtml(totals.income)}</td>
                <td class="num">${escapeHtml(totals.expense)}</td>
                <td class="num">${escapeHtml(totals.net)}</td>
              </tr>
            </tfoot>
          </table>

          <h2>${escapeHtml(labels.expenseDetails)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(labels.date)}</th>
                <th>${escapeHtml(labels.description)}</th>
                <th>${escapeHtml(labels.category)}</th>
                <th class="num">${escapeHtml(labels.amount)}</th>
              </tr>
            </thead>
            <tbody>${expenseHtml}</tbody>
          </table>

          <div class="footer">
            <span>${escapeHtml(companyName)}</span>
            <span>${escapeHtml(labels.generatedOn)}: ${escapeHtml(generatedOn)}</span>
          </div>

        </td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;
}

export async function generateAndShareReport(htmlBuilderInput, fileLabel) {
  const logoDataUri = await loadLogoDataUri();
  const html = buildReportHtml({ ...htmlBuilderInput, logoDataUri });

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // printToFileAsync writes into the cache directory under a random name.
  // Copying into the document directory gives the shared file a readable
  // name in whatever app receives it, and puts it somewhere Android's
  // FileProvider will serve from.
  const target = `${FileSystem.documentDirectory}${toSafeFileName(fileLabel)}.pdf`;

  let shareUri = uri;
  try {
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) {
      await FileSystem.deleteAsync(target, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: target });
    shareUri = target;
  } catch (err) {
    console.log('Could not relocate the report before sharing:', err.message);
  }

  // Pass the file:// URI as-is — expo-sharing performs the FileProvider
  // conversion internally and rejects a content:// URI outright.
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: fileLabel,
      UTI: 'com.adobe.pdf',
    });
  }

  return shareUri;
}
//-------------------------------ONE HEADER REPORT-------------------------------------
// import { Asset } from 'expo-asset';
// import * as FileSystem from 'expo-file-system/legacy';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
// // Reads the company logo off disk and inlines it as a data URI. WebView
// // printing can't resolve bundled asset paths, so the image has to travel
// // inside the HTML itself. Returns null on failure — the report renders
// // fine without a logo, so this never blocks the download.
// async function loadLogoDataUri() {
//   try {
//     const asset = Asset.fromModule(require('../assets/images/logo.png'));
//     await asset.downloadAsync();
//     if (!asset.localUri) return null;

//     const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
//       encoding: FileSystem.EncodingType.Base64,
//     });
//     return `data:image/png;base64,${base64}`;
//   } catch (err) {
//     console.log('Logo could not be embedded in the report:', err.message);
//     return null;
//   }
// }

// function escapeHtml(value) {
//   if (value == null) return '';
//   return String(value)
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;');
// }

// // Strips characters that are illegal in filenames so the period label can
// // be used as-is in the shared file's name.
// function toSafeFileName(label) {
//   return String(label)
//     .replace(/[\\/:*?"<>|]+/g, '-')
//     .replace(/\s+/g, '_')
//     .slice(0, 80);
// }

// /**
//  * Builds a plain, print-oriented report: black text on white, hairline
//  * rules, no fills or accent colours. Everything is laid out in points and
//  * a serif-free stack so it prints consistently rather than mimicking the
//  * app's on-screen styling.
//  */
// export function buildReportHtml({
//   logoDataUri,
//   companyName,
//   preparedFor,
//   title,
//   periodLabel,
//   generatedOn,
//   labels,
//   summaryRows,
//   monthlyRows,
//   expenseRows,
//   totals,
// }) {
//   const summaryHtml = summaryRows
//     .map(
//       (row) => `
//       <tr>
//         <td class="label">${escapeHtml(row.label)}</td>
//         <td class="value num">${escapeHtml(row.value)}</td>
//       </tr>`
//     )
//     .join('');

//   const monthlyHtml = monthlyRows
//     .map(
//       (row) => `
//       <tr>
//         <td>${escapeHtml(row.month)}</td>
//         <td class="num">${escapeHtml(row.income)}</td>
//         <td class="num">${escapeHtml(row.expense)}</td>
//         <td class="num">${escapeHtml(row.net)}</td>
//       </tr>`
//     )
//     .join('');

//   const expenseHtml = expenseRows.length
//     ? expenseRows
//         .map(
//           (row) => `
//       <tr>
//         <td>${escapeHtml(row.date)}</td>
//         <td>${escapeHtml(row.description)}</td>
//         <td>${escapeHtml(row.category)}</td>
//         <td class="num">${escapeHtml(row.amount)}</td>
//       </tr>`
//         )
//         .join('')
//     : `<tr><td colspan="4" class="empty">${escapeHtml(labels.noData)}</td></tr>`;

//   return `<!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { margin: 36pt 34pt 44pt 34pt; }

//   * { box-sizing: border-box; }

//   body {
//     font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
//     color: #111111;
//     font-size: 9.5pt;
//     line-height: 1.45;
//     margin: 0;
//   }

//   .header {
//     display: flex;
//     align-items: flex-start;
//     justify-content: space-between;
//     border-bottom: 1.2pt solid #111111;
//     padding-bottom: 12pt;
//     margin-bottom: 18pt;
//   }
//   .brand { display: flex; align-items: center; gap: 10pt; }
//   .brand img { width: 34pt; height: 34pt; object-fit: contain; }
//   .brand-name { font-size: 13pt; font-weight: 700; letter-spacing: 0.2pt; }
//   .brand-sub { font-size: 8pt; color: #555555; margin-top: 1pt; }

//   .meta { text-align: right; font-size: 8pt; color: #555555; }
//   .meta strong { display: block; font-size: 11pt; color: #111111; font-weight: 700; margin-bottom: 3pt; }
//   .meta span { display: block; }

//   h2 {
//     font-size: 9pt;
//     font-weight: 700;
//     text-transform: uppercase;
//     letter-spacing: 0.7pt;
//     color: #111111;
//     margin: 20pt 0 7pt 0;
//     padding-bottom: 4pt;
//     border-bottom: 0.6pt solid #cccccc;
//   }
//   h2:first-of-type { margin-top: 0; }

//   table { width: 100%; border-collapse: collapse; }
//   th {
//     text-align: left;
//     font-size: 8pt;
//     font-weight: 700;
//     text-transform: uppercase;
//     letter-spacing: 0.4pt;
//     color: #444444;
//     padding: 5pt 6pt;
//     border-bottom: 0.8pt solid #999999;
//   }
//   td {
//     padding: 5pt 6pt;
//     border-bottom: 0.4pt solid #e0e0e0;
//     vertical-align: top;
//   }
//   .num { text-align: right; white-space: nowrap; }
//   th.num { text-align: right; }

//   /* Summary reads as a definition list rather than a data grid. */
//   .summary td { border-bottom: 0.4pt solid #e0e0e0; }
//   .summary td.label { color: #444444; width: 62%; }
//   .summary td.value { font-weight: 700; }
//   .summary tr:last-child td {
//     border-top: 0.8pt solid #999999;
//     border-bottom: 1.2pt solid #111111;
//     font-weight: 700;
//   }

//   tfoot td {
//     border-top: 0.8pt solid #999999;
//     border-bottom: 1.2pt solid #111111;
//     font-weight: 700;
//   }

//   .empty { text-align: center; color: #777777; padding: 14pt 6pt; }

//   .footer {
//     margin-top: 22pt;
//     padding-top: 8pt;
//     border-top: 0.4pt solid #cccccc;
//     font-size: 7.5pt;
//     color: #777777;
//     display: flex;
//     justify-content: space-between;
//   }
// </style>
// </head>
// <body>

//   <div class="header">
//     <div class="brand">
//       ${logoDataUri ? `<img src="${logoDataUri}" alt="" />` : ''}
//       <div>
//         <div class="brand-name">${escapeHtml(companyName)}</div>
//         <div class="brand-sub">${escapeHtml(labels.preparedFor)}: ${escapeHtml(preparedFor)}</div>
//       </div>
//     </div>
//     <div class="meta">
//       <strong>${escapeHtml(title)}</strong>
//       <span>${escapeHtml(labels.period)}: ${escapeHtml(periodLabel)}</span>
//       <span>${escapeHtml(labels.generatedOn)}: ${escapeHtml(generatedOn)}</span>
//     </div>
//   </div>

//   <h2>${escapeHtml(labels.summary)}</h2>
//   <table class="summary">
//     <tbody>${summaryHtml}</tbody>
//   </table>

//   <h2>${escapeHtml(labels.monthlyBreakdown)}</h2>
//   <table>
//     <thead>
//       <tr>
//         <th>${escapeHtml(labels.month)}</th>
//         <th class="num">${escapeHtml(labels.income)}</th>
//         <th class="num">${escapeHtml(labels.expense)}</th>
//         <th class="num">${escapeHtml(labels.net)}</th>
//       </tr>
//     </thead>
//     <tbody>${monthlyHtml}</tbody>
//     <tfoot>
//       <tr>
//         <td>${escapeHtml(labels.total)}</td>
//         <td class="num">${escapeHtml(totals.income)}</td>
//         <td class="num">${escapeHtml(totals.expense)}</td>
//         <td class="num">${escapeHtml(totals.net)}</td>
//       </tr>
//     </tfoot>
//   </table>

//   <h2>${escapeHtml(labels.expenseDetails)}</h2>
//   <table>
//     <thead>
//       <tr>
//         <th>${escapeHtml(labels.date)}</th>
//         <th>${escapeHtml(labels.description)}</th>
//         <th>${escapeHtml(labels.category)}</th>
//         <th class="num">${escapeHtml(labels.amount)}</th>
//       </tr>
//     </thead>
//     <tbody>${expenseHtml}</tbody>
//   </table>

//   <div class="footer">
//     <span>${escapeHtml(companyName)}</span>
//     <span>${escapeHtml(labels.generatedOn)}: ${escapeHtml(generatedOn)}</span>
//   </div>

// </body>
// </html>`;
// }

// export async function generateAndShareReport(htmlBuilderInput, fileLabel) {
//   const logoDataUri = await loadLogoDataUri();
//   const html = buildReportHtml({ ...htmlBuilderInput, logoDataUri });

//   const { uri } = await Print.printToFileAsync({ html, base64: false });

//   // printToFileAsync writes into the cache directory under a random name.
//   // Copying into the document directory gives the shared file a readable
//   // name in whatever app receives it, and puts it somewhere Android's
//   // FileProvider will serve from.
//   const target = `${FileSystem.documentDirectory}${toSafeFileName(fileLabel)}.pdf`;

//   let shareUri = uri;
//   try {
//     const existing = await FileSystem.getInfoAsync(target);
//     if (existing.exists) {
//       await FileSystem.deleteAsync(target, { idempotent: true });
//     }
//     await FileSystem.copyAsync({ from: uri, to: target });
//     shareUri = target;
//   } catch (err) {
//     console.log('Could not relocate the report before sharing:', err.message);
//   }

//   // Pass the file:// URI as-is — expo-sharing performs the FileProvider
//   // conversion internally and rejects a content:// URI outright.
//   if (await Sharing.isAvailableAsync()) {
//     await Sharing.shareAsync(shareUri, {
//       mimeType: 'application/pdf',
//       dialogTitle: fileLabel,
//       UTI: 'com.adobe.pdf',
//     });
//   }

//   return shareUri;
// }