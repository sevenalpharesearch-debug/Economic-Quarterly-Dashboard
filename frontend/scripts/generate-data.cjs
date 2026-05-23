const fs = require('fs');
const path = require('path');
const { parseWorkbookBuffer, ensureMarketSectorInIndustries } = require('./parser.cjs');

const activeFilePath = path.join(__dirname, '..', '..', 'Data.xlsx');
const outputFilePath = path.join(__dirname, '..', 'public', 'data.json');

try {
  console.log('[Dashboard] Reading Excel file from:', activeFilePath);
  const buffer = fs.readFileSync(activeFilePath);
  
  console.log('[Dashboard] Parsing Excel file...');
  const { industries } = parseWorkbookBuffer(buffer);
  
  const finalData = ensureMarketSectorInIndustries(industries);
  
  const payload = {
    success: true,
    industries: finalData,
    defaultDataset: {
      originalName: 'Data.xlsx',
      uploadedAt: new Date().toISOString(),
      size: buffer.length
    }
  };
  
  console.log('[Dashboard] Writing JSON data to:', outputFilePath);
  fs.writeFileSync(outputFilePath, JSON.stringify(payload));
  console.log('[Dashboard] Successfully generated static data for frontend.');
} catch (error) {
  console.error('[Dashboard] Error generating static data:', error.message);
  process.exit(1);
}
