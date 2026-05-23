const fs = require('fs');

let code = fs.readFileSync('frontend/scripts/parser.cjs', 'utf8');

code = code.replace(/const express = require\('express'\);/, '');
code = code.replace(/const multer = require\('multer'\);/, '');
code = code.replace(/const { protect } = require\('\.\.\/middleware\/authMiddleware'\);/, '');
code = code.replace(/const SUMMARY_GROWTH_CONFIG = require\('\.\.\/config\/summaryGrowthConfig'\);/, "const SUMMARY_GROWTH_CONFIG = require('./config.cjs');");
code = code.replace(/module\.exports = router;/, "module.exports = { parseWorkbookBuffer, ensureMarketSectorInIndustries };");

fs.writeFileSync('frontend/scripts/parser.cjs', code);
