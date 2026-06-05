const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'Data.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Market Dashboard'];
if (sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const startRowIdx = data.findIndex(r => r[0] === 'Start');
  if (startRowIdx !== -1) {
    const headerRow = data[startRowIdx];
    const metrics = [];
    for (let col = 3; col < headerRow.length; col += 1) {
      if (headerRow[col] != null) {
        metrics.push(headerRow[col]);
        col += 1;
      }
    }
    console.log("Metrics in Market Dashboard:", metrics);
  } else {
    console.log("No Start row found in Market Dashboard");
  }
} else {
  console.log("Sheet 'Market Dashboard' not found");
}
