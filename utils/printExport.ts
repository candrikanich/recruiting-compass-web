/**
 * Generate print-friendly HTML content and trigger print
 */
export const printContent = (title: string, htmlContent: string) => {
  const printWindow = window.open("", "", "width=900,height=600");
  if (!printWindow) return;

  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 40px;
          background: white;
        }
        header {
          margin-bottom: 40px;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
        }
        h1 {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .timestamp {
          font-size: 12px;
          color: #6b7280;
        }
        .content {
          margin: 30px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #e5e7eb;
          color: #374151;
        }
        td {
          padding: 12px;
          border: 1px solid #e5e7eb;
        }
        tr:nth-child(even) {
          background: #f9fafb;
        }
        .summary {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .summary p {
          margin: 8px 0;
          font-size: 14px;
        }
        .summary strong {
          color: #1f2937;
        }
        footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        @media print {
          body {
            padding: 0;
          }
          header {
            border-bottom: 2px solid #3b82f6;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${title}</h1>
        <div class="timestamp">Generated on ${timestamp}</div>
      </header>
      <div class="content">
        ${htmlContent}
      </div>
      <footer>
        <p>Baseball Recruiting Compass • Confidential</p>
      </footer>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Trigger print after content loads
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/**
 * Generate HTML table from array of objects
 */
export const generateHtmlTable = (
  data: any[],
  columns: Array<{ key: string; label: string }>,
) => {
  const headerHtml = columns.map((col) => `<th>${col.label}</th>`).join("");

  const rowsHtml = data
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${row[col.key] || ""}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
};

/**
 * Generate summary statistics HTML
 */
export const generateSummary = (
  stats: Array<{ label: string; value: string | number }>,
) => {
  const statsHtml = stats
    .map((stat) => `<p><strong>${stat.label}:</strong> ${stat.value}</p>`)
    .join("");

  return `<div class="summary">${statsHtml}</div>`;
};
