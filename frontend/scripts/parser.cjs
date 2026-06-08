

const XLSX = require('xlsx');

const SUMMARY_GROWTH_CONFIG = require('./config.cjs');
const path = require('path');
const fs   = require('fs');

const FILES_DIR     = path.join(__dirname, '..', 'Files');
const ACTIVE_DIR    = path.join(FILES_DIR,  'active');
const BACKUP_DIR    = path.join(FILES_DIR,  'Backup');
const REGISTRY_PATH = path.join(FILES_DIR,  'file_registry.json');
const DATASETS_DIR  = path.join(FILES_DIR, 'datasets');
const HISTORY_DIR   = path.join(DATASETS_DIR, 'history');
const TEMP_UPLOADS_DIR = path.join(FILES_DIR, 'temp');
const STATUS_PATH   = path.join(DATASETS_DIR, 'dataset_registry.json');
const DEFAULT_DATA_PATH = path.join(DATASETS_DIR, 'default_data.json');
const BACKUP_DATA_PATH  = path.join(DATASETS_DIR, 'backup_data.json');
const TEMP_DATA_PATH    = path.join(DATASETS_DIR, 'temp_uploaded_data.json');
const LEGACY_DATA_PATH  = path.join(FILES_DIR, 'dashboard_data.json');
const OPERATIONS_LOG_PATH = path.join(FILES_DIR, 'operations.log');
const STORAGE_LOCK_PATH = path.join(FILES_DIR, '.file-operation.lock');

function ensureDirs() {
  [ACTIVE_DIR, BACKUP_DIR, DATASETS_DIR, HISTORY_DIR, TEMP_UPLOADS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function readJson(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`[Storage] Failed to read ${path.basename(filePath)}:`, e.message);
  }
  return fallback;
}

function writeJson(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filePath);
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function safeFilename(filename, fallback = 'uploaded-file') {
  const normalized = path.basename(String(filename || fallback)).trim();
  return normalized || fallback;
}

function appendOperationLog(action, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    ...details,
  };

  fs.appendFileSync(OPERATIONS_LOG_PATH, `${JSON.stringify(entry)}\n`);
  console.log(`[Storage:${action}]`, details);
}

function withStorageLock(task) {
  ensureDirs();
  let lockFd;

  try {
    lockFd = fs.openSync(STORAGE_LOCK_PATH, 'wx');
  } catch (err) {
    if (err.code === 'EEXIST') {
      throw new Error('Another file operation is already in progress. Please retry.');
    }
    throw err;
  }

  try {
    fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, lockedAt: new Date().toISOString() }));
    return task();
  } finally {
    if (lockFd !== undefined) {
      fs.closeSync(lockFd);
    }
    removeFileIfExists(STORAGE_LOCK_PATH);
  }
}

function stageUploadedFile(file, uploadedAt) {
  const originalName = safeFilename(file.originalname);
  const stagedFilename = `${safeTimestamp()}_${originalName}`;
  const stagedPath = path.join(TEMP_UPLOADS_DIR, stagedFilename);
  fs.writeFileSync(stagedPath, file.buffer);
  appendOperationLog('upload_staged', {
    originalName,
    stagedFilename,
    size: file.size,
    uploadedAt,
  });
  return { originalName, stagedFilename, stagedPath };
}

function createRawBackupMeta(overrides = {}) {
  return {
    id: overrides.id || safeTimestamp(),
    filename: overrides.filename,
    originalName: overrides.originalName || overrides.filename,
    uploadedAt: overrides.uploadedAt || null,
    backedUpAt: overrides.backedUpAt || new Date().toISOString(),
    restoredAt: overrides.restoredAt || null,
    size: overrides.size ?? null,
    source: overrides.source || 'file',
  };
}

function moveFileToBackup(sourcePath, originalName, metadata = {}, nowIso = new Date().toISOString()) {
  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  const safeOriginalName = safeFilename(originalName, path.basename(sourcePath));
  const backupMeta = createRawBackupMeta({
    id: safeTimestamp(),
    filename: `${safeTimestamp()}_${safeOriginalName}`,
    originalName: safeOriginalName,
    uploadedAt: metadata.uploadedAt || null,
    backedUpAt: nowIso,
    size: metadata.size ?? fs.statSync(sourcePath).size,
    source: metadata.source || 'file',
  });
  const backupPath = path.join(BACKUP_DIR, backupMeta.filename);
  fs.renameSync(sourcePath, backupPath);
  appendOperationLog('file_moved_to_backup', {
    from: sourcePath,
    to: backupPath,
    originalName: backupMeta.originalName,
    uploadedAt: backupMeta.uploadedAt,
    backedUpAt: backupMeta.backedUpAt,
    size: backupMeta.size,
  });
  return backupMeta;
}

function moveStageIntoActive(tempDataset, nowIso = new Date().toISOString()) {
  ensureDirs();
  const registry = readRegistry();
  const stagedFilename = tempDataset?.stagedFilename;
  const stagedPath = stagedFilename ? path.join(TEMP_UPLOADS_DIR, stagedFilename) : null;

  if (!stagedFilename || !stagedPath || !fs.existsSync(stagedPath)) {
    throw new Error('Temporary uploaded file is missing from staging.');
  }

  const activeFilename = safeFilename(tempDataset.originalName);
  const newActivePath = path.join(ACTIVE_DIR, activeFilename);
  const previousActive = registry.active ? { ...registry.active } : null;
  const previousActivePath = previousActive ? path.join(ACTIVE_DIR, previousActive.filename) : null;
  let backupCreated = null;
  let promoted = false;

  try {
    if (previousActivePath && fs.existsSync(previousActivePath)) {
      backupCreated = moveFileToBackup(previousActivePath, previousActive.originalName, previousActive, nowIso);
      if (backupCreated) {
        registry.backups.unshift(backupCreated);
      }
    }

    const activeFiles = fs.readdirSync(ACTIVE_DIR)
      .filter((entry) => fs.statSync(path.join(ACTIVE_DIR, entry)).isFile() && entry !== activeFilename);

    for (const strayFile of activeFiles) {
      const strayPath = path.join(ACTIVE_DIR, strayFile);
      const strayBackup = moveFileToBackup(strayPath, strayFile, {
        size: fs.statSync(strayPath).size,
        source: 'orphaned-active',
      }, nowIso);
      if (strayBackup) {
        registry.backups.unshift(strayBackup);
      }
    }

    if (fs.existsSync(newActivePath)) {
      const conflictingBackup = moveFileToBackup(newActivePath, activeFilename, {
        size: fs.statSync(newActivePath).size,
        source: 'conflicting-active',
      }, nowIso);
      if (conflictingBackup) {
        registry.backups.unshift(conflictingBackup);
      }
    }

    fs.renameSync(stagedPath, newActivePath);
    promoted = true;
    appendOperationLog('active_file_replaced', {
      from: stagedPath,
      to: newActivePath,
      originalName: activeFilename,
      uploadedAt: tempDataset.uploadedAt || nowIso,
      size: tempDataset.rawSize ?? tempDataset.size ?? null,
    });

    registry.active = {
      filename: activeFilename,
      originalName: activeFilename,
      uploadedAt: tempDataset.uploadedAt || nowIso,
      setAsDefaultAt: nowIso,
      size: tempDataset.rawSize ?? tempDataset.size ?? null,
    };
    writeRegistry(registry);

    return {
      registry,
      backupCreated,
      activeFile: registry.active,
    };
  } catch (err) {
    appendOperationLog('active_file_replace_failed', {
      message: err.message,
      stagedFilename,
      activeFilename,
    });

    if (promoted && fs.existsSync(newActivePath) && !fs.existsSync(stagedPath)) {
      fs.renameSync(newActivePath, stagedPath);
    }

    if (backupCreated && previousActivePath && !fs.existsSync(previousActivePath)) {
      const backupPath = path.join(BACKUP_DIR, backupCreated.filename);
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, previousActivePath);
      }
    }

    throw err;
  }
}

function getEmptyStatus() {
  return {
    defaultDataset: null,
    tempDataset: null,
    backups: [],
  };
}

function readRegistry() {
  return readJson(REGISTRY_PATH, { active: null, backups: [] });
}

function readStatus() {
  const status = readJson(STATUS_PATH, null);
  if (status) {
    return {
      ...getEmptyStatus(),
      ...status,
      backups: Array.isArray(status.backups) ? status.backups : [],
    };
  }

  const legacyRegistry = readRegistry();
  return {
    defaultDataset: legacyRegistry.active
      ? {
          filename: 'default_data.json',
          originalName: legacyRegistry.active.originalName,
          uploadedAt: legacyRegistry.active.uploadedAt,
          persistedAt: legacyRegistry.active.uploadedAt,
          size: legacyRegistry.active.size,
        }
      : null,
    tempDataset: null,
    backups: Array.isArray(legacyRegistry.backups) ? legacyRegistry.backups.map((backup, index) => ({
      id: backup.filename || `legacy-backup-${index + 1}`,
      filename: backup.filename,
      originalName: backup.originalName,
      uploadedAt: backup.uploadedAt,
      backedUpAt: backup.backedUpAt,
      size: backup.size,
      source: 'legacy',
    })) : [],
  };
}

function writeStatus(data) {
  writeJson(STATUS_PATH, data);
}

function writeRegistry(data) {
  writeJson(REGISTRY_PATH, data);
}

function createDatasetMeta(overrides = {}) {
  return {
    filename: overrides.filename || 'default_data.json',
    originalName: overrides.originalName || overrides.filename || 'dataset.json',
    uploadedAt: overrides.uploadedAt || new Date().toISOString(),
    persistedAt: overrides.persistedAt || new Date().toISOString(),
    setAsDefaultAt: overrides.setAsDefaultAt || null,
    restoredAt: overrides.restoredAt || null,
    size: overrides.size ?? null,
    stagedFilename: overrides.stagedFilename || null,
    rawSize: overrides.rawSize ?? null,
  };
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Memory storage — parse immediately, never write to disk

// ─────────────────────────────────────────────────────────────────────────────
//  PARSE — find "Start" row dynamically, extract all series
// ─────────────────────────────────────────────────────────────────────────────
function extractSeries(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Find the row where col[0] === 'Start' — works regardless of how many
  // header/category rows appear above it (varies per sheet).
  const startRowIdx = data.findIndex(r => r[0] === 'Start');
  if (startRowIdx === -1) return {};

  const headerRow = data[startRowIdx];
  const seriesColumns = [];
  // Use col += 1 but skip the description column manually when a metric is found
  for (let col = 3; col < headerRow.length; col += 1) {
    if (headerRow[col] != null) {
      seriesColumns.push({
        name: String(headerRow[col]).trim(),
        description: headerRow[col + 1] ? String(headerRow[col + 1]).trim() : null,
        dateCol: col,
        valCol: col + 1,
      });
      // Skip the description/value column so it isn't treated as a new metric
      col += 1;
    }
  }

  // Row after "Start" is the bloomberg-code row ("End") — skip both.
  const dataStart = startRowIdx + 2;

  const results = {};
  for (const seriesInfo of seriesColumns) {
    const { name, description, dateCol, valCol } = seriesInfo;
    const points  = [];

    for (let ri = dataStart; ri < data.length; ri++) {
      const row    = data[ri];
      const rawDate = row[dateCol];
      const rawVal  = row[valCol];
      if (rawDate == null || rawVal == null) continue;
      const num = parseFloat(rawVal);
      if (isNaN(num)) continue;

      let date;
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        date = rawDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (typeof rawDate === 'number') {
        // Manual Excel serial-date fallback (no XLSX.SSF needed)
        const d = new Date(Date.UTC(1899, 11, 30) + rawDate * 86400000);
        date = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        date = rawDate.trim();
      } else {
        continue;
      }
      points.push([date, Math.round(num * 10000) / 10000]);
    }
    results[name] = { points, description };
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function lbl(arr) { return arr.map(x => x[0]); }
function vals(arr) { return arr.map(x => x[1]); }

// Pick the last n distinct chronological dates present across any series
function getLastDates(seriesArrays, n = 5) {
  const dateSet = new Set();
  for (const arr of seriesArrays) for (const [d] of arr) dateSet.add(d);
  return [...dateSet].sort((a, b) => new Date(a) - new Date(b)).slice(-n);
}

function kch(arr, isAbs = false, suffix = '', rnd = 2) {
  if (arr.length < 2) return ['+0', true];
  const c = arr[arr.length - 1][1];
  const p = arr[arr.length - 2][1];
  const ch = c - p;
  const up = ch >= 0;
  const sg = up ? '+' : '';
  if (isAbs) return [`${sg}${Math.round(ch * 10 ** rnd) / 10 ** rnd}${suffix}`, up];
  if (Math.abs(p) > 0) return [`${sg}${Math.round((ch / Math.abs(p)) * 1000) / 10}%`, up];
  return ['+0%', true];
}

function trArrow(arr) {
  if (arr.length < 2) return '▲';
  return arr[arr.length - 1][1] >= arr[arr.length - 2][1] ? '▲' : '▼';
}

function safe(arr) { return arr.length ? arr[arr.length - 1][1] : 0; }

function qrow(name, arr, fmt, QL, KS) {
  const d = Object.fromEntries(arr);
  const row = { indicator: name };
  KS.forEach((ki, i) => {
    const v = d[QL[i]];
    row[ki] = v != null ? (fmt ? fmt(v) : String(Math.round(v * 100) / 100)) : '-';
  });
  row.trend = trArrow(arr);
  return row;
}

function spreadSeries(s1, s2) {
  const d2 = Object.fromEntries(s2);
  return s1.filter(([k]) => d2[k] != null).map(([k, v]) => [k, Math.round((v - d2[k]) * 10000) / 10000]);
}

// Safe series lookup — returns [] instead of throwing if name not found
function get(sheet, name) {
  const keys = Object.keys(sheet || {});
  const exactKey = keys.find((key) => key.trim() === name);
  const normalizedName = normalizeMetricName(name);
  const normalizedKey = keys.find((key) => normalizeMetricName(key) === normalizedName);
  
  let targetKey = exactKey || normalizedKey;
  
  if (!targetKey) {
    const aliases = METRIC_ALIASES[name] || [];
    for (const alias of aliases) {
      const aliasKey = keys.find((key) => normalizeMetricName(key) === normalizeMetricName(alias));
      if (aliasKey) {
        targetKey = aliasKey;
        break;
      }
    }
  }

  if (targetKey) {
    const data = sheet[targetKey];
    // Return points if it's the new object structure, otherwise return the array itself (legacy support)
    return data && data.points ? data.points : (Array.isArray(data) ? data : []);
  }

  return [];
}

function getDescription(sheet, name) {
  const keys = Object.keys(sheet || {});
  const exactKey = keys.find((key) => key.trim() === name);
  const normalizedName = normalizeMetricName(name);
  const normalizedKey = keys.find((key) => normalizeMetricName(key) === normalizedName);
  
  let targetKey = exactKey || normalizedKey;
  
  if (!targetKey) {
    const aliases = METRIC_ALIASES[name] || [];
    for (const alias of aliases) {
      const aliasKey = keys.find((key) => normalizeMetricName(key) === normalizeMetricName(alias));
      if (aliasKey) {
        targetKey = aliasKey;
        break;
      }
    }
  }

  if (targetKey) {
    const data = sheet[targetKey];
    return data && data.description ? data.description : null;
  }

  return null;
}

function normalizeMetricName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[().,/%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const METRIC_ALIASES = {
  'Midcap 100 P/E': ['MidCap 100'],
  'Monthly IPO Data': ['IPO Monthly Number'],
  'India Nominal GDP (YOY %)': ['India Nominal GDP'],
};

const MARKET_SUMMARY_METRICS = [
  'Nifty 50 P/E',
  'Midcap 100 P/E',
  'India Real GDP (YOY %)',
  'India Nominal GDP (YOY %)',
  'India Bank Credit growth',
  'Monthly IPO Data',
  '% of Stocks above 50 DMA',
  '% of Stocks above 100 DMA',
  '% of Stocks above 200 DMA',
];

const MARKET_METRIC_UNITS = {
  'Nifty 50 P/E': 'P/E',
  'Midcap 100 P/E': 'P/E',
  'India Real GDP (YOY %)': '%',
  'India Nominal GDP (YOY %)': '%',
  'India Bank Credit growth': '%',
  'Monthly IPO Data': 'units',
  '% of Stocks above 50 DMA': '%',
  '% of Stocks above 100 DMA': '%',
  '% of Stocks above 200 DMA': '%',
};

function formatMarketMetricValue(metricName, value) {
  if (!Number.isFinite(value)) return '0';
  if (metricName === 'Monthly IPO Data') return value.toFixed(0);
  return value.toFixed(1);
}

function buildSeriesMap(seriesList = []) {
  return Object.fromEntries(
    (Array.isArray(seriesList) ? seriesList : [])
      .map((series) => [normalizeMetricName(series?.title || series?.series?.[0]?.name || ''), series])
      .filter(([key]) => key)
  );
}

function buildMarketSectorFromSeriesMap(seriesMap = {}) {
  const getMetricSeries = (metricName) => {
    const metric = seriesMap[normalizeMetricName(metricName)];
    if (!metric) return null;

    const labels = Array.isArray(metric.labels) ? metric.labels : [];
    const data = Array.isArray(metric.series?.[0]?.data) ? metric.series[0].data : [];
    const pointCount = Math.min(labels.length, data.length);

    if (!pointCount) return null;

    return {
      title: metricName,
      labels: labels.slice(0, pointCount),
      series: [
        {
          name: metricName,
          data: data.slice(0, pointCount),
        },
      ],
    };
  };

  const summaryGrowthMetrics = MARKET_SUMMARY_METRICS
    .map(getMetricSeries)
    .filter(Boolean);

  if (!summaryGrowthMetrics.length) {
    return null;
  }

  const seriesLookup = Object.fromEntries(
    summaryGrowthMetrics.map((metric) => [metric.title, metric.series[0]])
  );
  const labelsLookup = Object.fromEntries(
    summaryGrowthMetrics.map((metric) => [metric.title, metric.labels])
  );
  const summarySeriesArrays = summaryGrowthMetrics.map((metric) => (
    metric.labels.map((label, index) => [label, metric.series[0].data[index]])
  ));
  const tableDates = getLastDates(summarySeriesArrays, 5);
  const tableKeys = ['col0', 'col1', 'col2', 'col3', 'col4'].slice(0, tableDates.length);
  const metricCards = summaryGrowthMetrics.map((metric) => {
    const values = metric.series[0].data.filter((value) => typeof value === 'number' && Number.isFinite(value));
    const latestValue = values[values.length - 1];
    const [change, up] = kch(metric.labels.map((label, index) => [label, metric.series[0].data[index]]));

    return {
      label: metric.title,
      value: Number.isFinite(latestValue) ? formatMarketMetricValue(metric.title, latestValue) : '0',
      change,
      up,
    };
  });

  const getChart = (metricName, color) => {
    const series = seriesLookup[metricName];
    const labels = labelsLookup[metricName] || [];
    return series ? {
      title: metricName,
      unit: MARKET_METRIC_UNITS[metricName] || '',
      labels,
      series: [{ name: metricName, data: series.data, color }],
    } : null;
  };

  return {
    id: 'market',
    label: 'Market Dashboard',
    title: 'Market Dashboard',
    subtitle: 'Market valuation, macro growth, bank credit growth, and IPO activity',
    metrics: metricCards,
    tableColumns: ['Indicator', ...tableDates, 'Trend'],
    tableRows: summaryGrowthMetrics.map((metric) => {
      const rowSeries = metric.labels.map((label, index) => [label, metric.series[0].data[index]]);
      return qrow(
        metric.title,
        rowSeries,
        (value) => formatMarketMetricValue(metric.title, Number(value)),
        tableDates,
        tableKeys
      );
    }),
    charts: [
      getChart('Nifty 50 P/E', '#6366f1'),
      getChart('Midcap 100 P/E', '#14b8a6'),
      getChart('India Real GDP (YOY %)', '#0ea5e9'),
      getChart('India Nominal GDP (YOY %)', '#8b5cf6'),
      getChart('India Bank Credit growth', '#22c55e'),
      getChart('Monthly IPO Data', '#f59e0b'),
      getChart('% of Stocks above 50 DMA', '#ec4899'),
      getChart('% of Stocks above 100 DMA', '#8b5cf6'),
      getChart('% of Stocks above 200 DMA', '#10b981'),
    ].filter(Boolean),
    summaryGrowthMetrics,
  };
}

function buildMarketSectorFromEquity(equityIndustry) {
  const summarySeriesMap = buildSeriesMap(equityIndustry?.summaryGrowthMetrics);
  const chartSeriesMap = buildSeriesMap(
    (Array.isArray(equityIndustry?.charts) ? equityIndustry.charts : [])
      .map((chart) => ({
        title: chart?.series?.[0]?.name || chart?.title,
        labels: chart?.labels,
        series: [{ name: chart?.series?.[0]?.name || chart?.title, data: chart?.series?.[0]?.data }],
      }))
  );

  return buildMarketSectorFromSeriesMap({
    ...chartSeriesMap,
    ...summarySeriesMap,
  });
}

function ensureMarketSectorInIndustries(industries) {
  if (!Array.isArray(industries)) return industries;
  if (industries.some((industry) => industry?.id === 'market')) return industries;

  const market = buildMarketSectorFromEquity(
    industries.find((industry) => industry?.id === 'equity')
  );

  if (!market) return industries;

  const nextIndustries = [...industries];
  const equityIndex = nextIndustries.findIndex((industry) => industry?.id === 'equity');

  if (equityIndex >= 0) {
    nextIndustries.splice(equityIndex, 0, market);
    return nextIndustries;
  }

  nextIndustries.push(market);
  return nextIndustries;
}

function buildSummaryGrowthMetrics(industryId, allData) {
  const sectorConfig = SUMMARY_GROWTH_CONFIG[industryId];
  if (!sectorConfig) return [];

  const sheetData = allData[sectorConfig.sheet] || {};

  if (industryId === 'transport') {
    const twoW = get(sheetData, '2W Registration');
    const threeW = get(sheetData, '3W Registration');
    const pv = get(sheetData, 'PV Registration');
    const cv = get(sheetData, 'CV Registration');
    const tractor = get(sheetData, 'Tractor Registration');

    const eTwoW = get(sheetData, 'E-2 Wheelers');
    const eThreeW = get(sheetData, 'E-3 Wheelers');
    const eFourW = get(sheetData, 'E-4 Wheelers');
    const eBuses = get(sheetData, 'E- Buses');
    const baseSeries = twoW.length > 0 ? twoW : (eTwoW.length > 0 ? eTwoW : []);

    if (baseSeries.length > 0) {
      const twoWPenetration = [];
      const threeWPenetration = [];
      const fourWPenetration = [];
      const overallPenetration = [];

      baseSeries.forEach(([dateLabel]) => {
        const getVal = (series) => {
          const point = series.find(([label]) => label === dateLabel);
          return point ? point[1] : 0;
        };

        const v2W = getVal(twoW);
        const v3W = getVal(threeW);
        const vPV = getVal(pv);
        const vCV = getVal(cv);
        const vTractor = getVal(tractor);

        const vE2W = getVal(eTwoW);
        const vE3W = getVal(eThreeW);
        const vE4W = getVal(eFourW);
        const vEBuses = getVal(eBuses);

        twoWPenetration.push([dateLabel, v2W ? (vE2W / v2W) * 100 : 0]);
        threeWPenetration.push([dateLabel, v3W ? (vE3W / v3W) * 100 : 0]);
        
        const denOther = vPV + vCV + vTractor;
        const numOther = vE4W; // E-Buses removed
        fourWPenetration.push([dateLabel, denOther ? (numOther / denOther) * 100 : 0]);

        const denOverall = v2W + v3W + vPV + vCV + vTractor;
        const numOverall = vE2W + vE3W + vE4W + vEBuses;
        overallPenetration.push([dateLabel, denOverall ? (numOverall / denOverall) * 100 : 0]);
      });

      sheetData['2W EV Penetration'] = { points: twoWPenetration, description: '2W EV Penetration %' };
      sheetData['3W EV Penetration'] = { points: threeWPenetration, description: '3W EV Penetration %' };
      sheetData['Other EV Penetration (PV, CV & Tractor)'] = { points: fourWPenetration, description: 'Other EV Penetration (PV, CV & Tractor) %' };
      sheetData['Overall EV Penetration'] = { points: overallPenetration, description: 'Overall EV Penetration %' };
    }
  }

  const added = new Set();
  const results = [];

  sectorConfig.metrics.forEach((metricName) => {
    const series = get(sheetData, metricName);
    if (!series.length) return;

    added.add(normalizeMetricName(metricName));

    results.push({
      title: metricName,
      description: getDescription(sheetData, metricName),
      labels: lbl(series),
      series: [
        {
          name: metricName,
          data: vals(series),
        },
      ],
    });
  });

  Object.keys(sheetData).forEach((sheetMetricKey) => {
    const normKey = normalizeMetricName(sheetMetricKey);
    if (normKey === normalizeMetricName('India Nominal GDP')) return;
    if (!added.has(normKey)) {
      const series = get(sheetData, sheetMetricKey);
      if (!series.length) return;
      added.add(normKey);

      results.push({
        title: sheetMetricKey,
        description: getDescription(sheetData, sheetMetricKey),
        labels: lbl(series),
        series: [
          {
            name: sheetMetricKey,
            data: vals(series),
          },
        ],
      });
    }
  });

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
//  BUILD DASHBOARD  — maps parsed sheet data → dashboard structure
// ─────────────────────────────────────────────────────────────────────────────
function buildDashboard(allData) {
  const ei   = allData['Economic Indicators']          || {};
  const im   = allData['Industrial and Manufacturing'] || {};
  const tr2  = allData['Transportation and Automotive']|| {};
  const se   = allData['Services and exports']         || {};
  const bf   = allData['Banking and Finance']          || {};
  const cp   = allData['Commodity Price '] || allData['Commodity Price'] || {};
  const ty   = allData['Treasury Yield']               || {};
  const ix   = allData['Index']                        || {};

  // ── Dynamic table date labels (last 5 periods in the file) ────────────────
  const _allSeries = Object.values(allData).flatMap(sheet => 
    Object.values(sheet).map(s => (s && s.points ? s.points : s))
  );
  const QL = getLastDates(_allSeries, 5);
  const QC = ['Indicator', ...QL, 'Trend'];
  const KS = ['col0', 'col1', 'col2', 'col3', 'col4'].slice(0, QL.length);
  const qr = (name, arr, fmt) => qrow(name, arr, fmt, QL, KS);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Economic Indicators ──────────────────────────────────────────────────
  const gst     = get(ei, 'GST Collections');
  const cpi     = get(ei, 'Retail Inflation (CPI)');
  const trade   = get(ei, 'India Trade Balance');
  const pmiC    = get(ei, 'Composite PMI');
  const vixI    = get(ei, 'India VIX');
  const rateI   = get(ei, 'India Interest Rate');
  const usdInr  = get(ei, 'Dollar Rupee Exchange Rate');
  const dxy     = get(ei, 'DXY Index');
  const depGr   = get(ei, 'India Deposit Growth Rate');
  const credGr  = get(ei, 'India Credit growth rate');
  const goldRes = get(ei, 'India Gold Reserve');
  const fxRes   = get(ei, 'India Total FX Reserves');
  const fxResUsd= get(ei, 'India FX Reserves (USD)');

  // ── Industrial & Manufacturing ───────────────────────────────────────────
  const mfgPmi  = get(im, 'Manufacturing PMI');
  const steel   = get(im, 'Steel Production');
  const cementP = get(im, 'Cement Production');
  const elecP   = get(im, 'Electricity Production');
  const coalP   = get(im, 'Coal Production');
  const iipG    = get(im, 'IIP Overall Growth');
  const fert    = get(im, 'Fertilizer Production');
  const petro   = get(im, 'Petroleum Refinery Production');
  const natGas  = get(im, 'Natural Gas Production');
  const crude   = get(im, 'Crude Oil Production');
  const iipCap  = get(im, 'IIP Capital Goods');
  const iipCon  = get(im, 'IIP Consumer Durables');
  const steel1k = get(im, 'Steel Production (1000 Metric Tons)');

  // ── Transportation & Automotive ──────────────────────────────────────────
  const tw      = get(tr2, '2W Registration');
  const thw     = get(tr2, '3W Registration');
  const pvR     = get(tr2, 'PV Registration');
  const cvR     = get(tr2, 'CV Registration');
  const tractor = get(tr2, 'Tractor Registration');

  // ── Services & Exports ───────────────────────────────────────────────────
  const svcPmi  = get(se, 'Service PMI');
  const svcExp  = get(se, 'Service Exports');
  const mercExp = get(se, 'Merchandise Exports');
  const elecExp = get(se, 'Electronics Goods');

  // ── Banking & Finance ────────────────────────────────────────────────────
  const nfc      = get(bf, 'Non-Food Credit');
  const ms       = get(bf, 'Money Supply');
  const liq      = get(bf, 'Banking Liquidity');
  const cc       = get(bf, 'Credit Card Outstanding');
  const vehLoan  = get(bf, 'Vehicle Loans');
  const goldLoan = get(bf, 'Loan against gold jewellery');
  const agri     = get(bf, 'Credit Deployed (Agri)');
  const indC     = get(bf, 'Credit Deployed (Industries)');
  const svcC     = get(bf, 'Credit Deployed (Services)');
  const personal = get(bf, 'Credit Deployed (Personal)');
  const otherPL  = get(bf, 'Other Personal Loans');

  // ── Commodities ──────────────────────────────────────────────────────────
  const goldC    = get(cp, 'Gold');
  const silverC  = get(cp, 'Silver');
  const copperC  = get(cp, 'Copper');
  const alumC    = get(cp, 'Aluminium');
  const steelC   = get(cp, 'Steel');
  const litC     = get(cp, 'Lithium');
  const ironC    = get(cp, 'Iron');
  const freightC = get(cp, 'Freight Rate');
  const cobaltC  = get(cp, 'Cobalt');
  const platC    = get(cp, 'Platinum');
  const nickelC  = get(cp, 'Nickel');
  const zincC    = get(cp, 'Zinc');
  const tinC     = get(cp, 'Tin');
  const palladC  = get(cp, 'Palladium');

  // ── Treasury Yield ───────────────────────────────────────────────────────
  const us10y   = get(ty, 'US-10Y');
  const us2y    = get(ty, 'US-2Y');
  const in10y   = get(ty, 'India-10Y');
  const in2y    = get(ty, 'India-2Y');
  const cn10y   = get(ty, 'China-10Y');
  const cn2y    = get(ty, 'China-2Y');
  const jp10y   = get(ty, 'Japan-10Y');
  const jp2y    = get(ty, 'Japan-2Y');
  const inrUsd  = get(ty, 'INR/USD');
  const jpyUsd  = get(ty, 'Japanese Yen/USD');
  const cnyUsd  = get(ty, 'CNY/USD');
  const inrEuro = get(ty, 'INR/Euro');

  const usSp = spreadSeries(us10y, us2y);
  const inSp = spreadSeries(in10y, in2y);
  const cnSp = spreadSeries(cn10y, cn2y);
  const jpSp = spreadSeries(jp10y, jp2y);

  // ── Equity / Indices ─────────────────────────────────────────────────────
  const nifty50    = get(ix, 'Nifty 50');
  const nse500     = get(ix, 'NSE 500');
  const midcap150  = get(ix, 'Nifty midcap 150');
  const midcap100  = get(ix, 'Nifty midcap 100');
  const smallcap250= get(ix, 'Nifty smallcap 250');
  const smallcap100= get(ix, 'Nifty smallcap 100');
  const sp500      = get(ix, 'S&P 500');
  const nasdaq     = get(ix, 'Nasdaq');
  const nikkei     = get(ix, 'Nikkei 225');
  const topix      = get(ix, 'TOPIX');
  const shanghai   = get(ix, 'Shanghai Composite Index');
  const csi300     = get(ix, 'CSI 300');
  const eurostoxx  = get(ix, 'EURO STOXX 50');
  const stoxxEur   = get(ix, 'STOXX Europe 600');

  // ─────────────────────────────────────────────────────────────────────────
  //  MACRO
  // ─────────────────────────────────────────────────────────────────────────
  const macro = {
    id: 'macro', label: 'Macro Economy',
    title: 'India Macro Economy Dashboard',
    subtitle: 'Real macroeconomic data — GST collections, CPI inflation, trade balance, PMI, repo rate, and currency',
    metrics: [
      { label: 'GST Collections (Rs.B)', value: `Rs.${safe(gst).toFixed(2)}B`,       change: kch(gst)[0],              up: kch(gst)[1] },
      { label: 'CPI Inflation (%)',       value: `${safe(cpi)}%`,                     change: kch(cpi, true, '%')[0],   up: kch(cpi, true)[1] },
      { label: 'Trade Balance (Rs.B)',    value: `Rs.${safe(trade).toFixed(0)}B`,     change: kch(trade, true, 'B')[0], up: kch(trade, true)[1] },
      { label: 'Composite PMI',           value: String(safe(pmiC)),                  change: kch(pmiC, true)[0],       up: kch(pmiC, true)[1] },
      { label: 'Repo Rate (%)',           value: `${safe(rateI)}%`,                   change: kch(rateI, true, '%')[0], up: !kch(rateI, true)[1] },
      { label: 'USD/INR',                 value: `Rs.${safe(usdInr).toFixed(2)}`,     change: kch(usdInr, true)[0],     up: !kch(usdInr, true)[1] },
      { label: 'India FX Reserves (USD)', value: `$ ${safe(fxResUsd).toLocaleString('en-IN')} Million`, change: kch(fxResUsd)[0], up: kch(fxResUsd)[1] },
      { label: 'India Gold Reserve',    value: `INR ${safe(goldRes).toLocaleString('en-IN')} Cr`, change: kch(goldRes)[0], up: kch(goldRes)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('GST Collections (Rs.B)',    gst,   x => x.toFixed(2)),
      qr('CPI Inflation (%)',         cpi),
      qr('Trade Balance (Rs.B)',      trade),
      qr('Composite PMI',             pmiC),
      qr('Repo Rate (%)',             rateI),
      qr('USD/INR',                   usdInr, x => x.toFixed(2)),
      qr('India Gold Reserve',        goldRes),
      qr('India FX Reserves (USD)', fxResUsd, x => x.toFixed(0)),
      qr('India Total FX Reserves', fxRes, x => x.toFixed(0)),
    ],
    charts: [
      { title: 'GST Collections (Rs. Billion)',      unit: 'Rs.B',  labels: lbl(gst),    series: [{ name: 'GST Collections',    data: vals(gst),    color: '#6366f1' }] },
      { title: 'Retail Inflation CPI (%)',           unit: '%',     labels: lbl(cpi),    series: [{ name: 'CPI',                data: vals(cpi),    color: '#ef4444' }] },
      { title: 'India Trade Balance (Rs.B)',         unit: 'Rs.B',  labels: lbl(trade),  series: [{ name: 'Trade Balance',      data: vals(trade),  color: '#f59e0b' }] },
      { title: 'Composite PMI',                     unit: 'index', labels: lbl(pmiC),   series: [{ name: 'Composite PMI',      data: vals(pmiC),   color: '#10b981' }] },
      { title: 'India VIX (Volatility Index)',       unit: 'index', labels: lbl(vixI),   series: [{ name: 'India VIX',          data: vals(vixI),   color: '#8b5cf6' }] },
      { title: 'Repo Rate (%)',                      unit: '%',     labels: lbl(rateI),  series: [{ name: 'Repo Rate',          data: vals(rateI),  color: '#0ea5e9' }] },
      { title: 'USD / INR Exchange Rate',            unit: 'Rs.',   labels: lbl(usdInr), series: [{ name: 'USD/INR',            data: vals(usdInr), color: '#f97316' }] },
      { title: 'DXY Dollar Index',                   unit: 'index', labels: lbl(dxy),    series: [{ name: 'DXY',                data: vals(dxy),    color: '#64748b' }] },
      { title: 'India Deposit Growth Rate (%)',      unit: '%',     labels: lbl(depGr),  series: [{ name: 'Deposit Growth',     data: vals(depGr),  color: '#14b8a6' }] },
      { title: 'India Credit Growth Rate (%)',       unit: '%',     labels: lbl(credGr), series: [{ name: 'Credit Growth',      data: vals(credGr), color: '#a855f7' }] },
      { title: 'India Gold Reserve (INR Cr)',        unit: 'INR Cr', labels: lbl(goldRes),series: [{ name: 'Gold Reserve',      data: vals(goldRes), color: '#d97706' }] },
      { title: 'India FX Reserves (USD)',            unit: '$M',    labels: lbl(fxResUsd),series: [{ name: 'FX Reserves (USD)', data: vals(fxResUsd),color: '#10b981' }] },
      { title: 'India FX Reserves (INR Cr)',         unit: 'Cr',    labels: lbl(fxRes),   series: [{ name: 'FX Reserves (INR)', data: vals(fxRes),   color: '#6366f1' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  INDUSTRIAL & MANUFACTURING
  // ─────────────────────────────────────────────────────────────────────────
  const industrial = {
    id: 'industrial', label: 'Industrial & Manufacturing',
    title: 'Industrial & Manufacturing Dashboard',
    subtitle: "India's core sector — steel, cement, electricity, coal, IIP growth, and manufacturing PMI",
    metrics: [
      { label: 'Manufacturing PMI',       value: String(safe(mfgPmi)),  change: kch(mfgPmi, true)[0],  up: kch(mfgPmi, true)[1] },
      { label: 'IIP Overall Growth (%)',  value: `${safe(iipG)}%`,      change: kch(iipG, true, '%')[0], up: kch(iipG, true)[1] },
      { label: 'Steel Production (Thousand Tons)', value: safe(steel1k).toLocaleString('en-IN'), change: kch(steel1k)[0], up: kch(steel1k)[1] },
      { label: 'Cement Production',       value: String(safe(cementP)), change: kch(cementP)[0],        up: kch(cementP)[1] },
      { label: 'Electricity (BU)',        value: String(safe(elecP)),   change: kch(elecP)[0],          up: kch(elecP)[1] },
      { label: 'Coal Production',         value: String(safe(coalP)),   change: kch(coalP)[0],          up: kch(coalP)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('Manufacturing PMI',      mfgPmi),
      qr('IIP Overall Growth (%)', iipG),
      qr('Steel Production (MT)',  steel,   x => x.toFixed(0)),
      qr('Cement Production',      cementP, x => x.toFixed(0)),
      qr('Electricity (BU)',       elecP,   x => x.toFixed(0)),
      qr('Coal Production',        coalP,   x => x.toFixed(0)),
      qr('Steel Production (Thousand Tons)', steel1k, x => x.toLocaleString('en-IN')),
    ],
    charts: [
      { title: 'Manufacturing PMI',                   unit: 'index', labels: lbl(mfgPmi),  series: [{ name: 'Mfg PMI',        data: vals(mfgPmi),  color: '#6366f1' }] },
      { title: 'IIP Overall Growth (%)',               unit: '%',     labels: lbl(iipG),    series: [{ name: 'IIP Overall',    data: vals(iipG),    color: '#10b981' }] },
      { title: 'IIP Capital Goods',                   unit: 'index', labels: lbl(iipCap),  series: [{ name: 'Capital Goods',  data: vals(iipCap),  color: '#14b8a6' }] },
      { title: 'IIP Consumer Durables',               unit: 'index', labels: lbl(iipCon),  series: [{ name: 'Consumer Dur.',  data: vals(iipCon),  color: '#f59e0b' }] },
      { title: 'Steel Production (MT)',                unit: 'MT',    labels: lbl(steel),   series: [{ name: 'Steel',          data: vals(steel),   color: '#ef4444' }] },
      { title: 'Cement Production (Index)',            unit: 'index', labels: lbl(cementP), series: [{ name: 'Cement',         data: vals(cementP), color: '#8b5cf6' }] },
      { title: 'Electricity Production (BU)',          unit: 'BU',    labels: lbl(elecP),   series: [{ name: 'Electricity',    data: vals(elecP),   color: '#0ea5e9' }] },
      { title: 'Coal Production (Index)',              unit: 'index', labels: lbl(coalP),   series: [{ name: 'Coal',           data: vals(coalP),   color: '#64748b' }] },
      { title: 'Natural Gas Production (Index)',       unit: 'index', labels: lbl(natGas),  series: [{ name: 'Natural Gas',    data: vals(natGas),  color: '#22c55e' }] },
      { title: 'Crude Oil Production (Index)',         unit: 'index', labels: lbl(crude),   series: [{ name: 'Crude Oil',      data: vals(crude),   color: '#d97706' }] },
      { title: 'Fertilizer Production (Index)',        unit: 'index', labels: lbl(fert),    series: [{ name: 'Fertilizer',     data: vals(fert),    color: '#a855f7' }] },
      { title: 'Petroleum Refinery Output (Index)',    unit: 'index', labels: lbl(petro),   series: [{ name: 'Petro Refinery', data: vals(petro),   color: '#be185d' }] },
      { title: 'Steel Production (Thousand Tons)',    unit: 'Thousand Tons', labels: lbl(steel1k), series: [{ name: 'Steel', data: vals(steel1k), color: '#ef4444' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  TRANSPORTATION & AUTOMOTIVE
  // ─────────────────────────────────────────────────────────────────────────
  const transport = {
    id: 'transport', label: 'Transportation & Automotive',
    title: 'Transportation & Automotive Dashboard',
    subtitle: 'India vehicle registration data — 2W, 3W, Passenger Vehicles, Commercial Vehicles, Tractors',
    metrics: [
      { label: '2-Wheeler Registrations', value: `${(safe(tw)/100000).toFixed(2)}L`,   change: kch(tw)[0],      up: kch(tw)[1] },
      { label: '3-Wheeler Registrations', value: `${(safe(thw)/1000).toFixed(1)}K`,    change: kch(thw)[0],     up: kch(thw)[1] },
      { label: 'Passenger Vehicles',      value: `${(safe(pvR)/1000).toFixed(1)}K`,    change: kch(pvR)[0],     up: kch(pvR)[1] },
      { label: 'Commercial Vehicles',     value: `${(safe(cvR)/1000).toFixed(1)}K`,    change: kch(cvR)[0],     up: kch(cvR)[1] },
      { label: 'Tractor Sales',           value: `${(safe(tractor)/1000).toFixed(1)}K`,change: kch(tractor)[0], up: kch(tractor)[1] },
      { label: 'Total Registered',        value: `${((safe(tw)+safe(thw)+safe(pvR)+safe(cvR))/100000).toFixed(2)}L`, change: '+0', up: true },
    ],
    tableColumns: QC,
    tableRows: [
      qr('2W Registration',      tw,      x => `${(x/1000).toFixed(0)}K`),
      qr('3W Registration',      thw,     x => `${(x/1000).toFixed(1)}K`),
      qr('Passenger Vehicles',   pvR,     x => `${(x/1000).toFixed(1)}K`),
      qr('Commercial Vehicles',  cvR,     x => `${(x/1000).toFixed(1)}K`),
      qr('Tractor Registration', tractor, x => `${(x/1000).toFixed(1)}K`),
    ],
    charts: [
      { title: '2-Wheeler Registrations',    unit: 'units', labels: lbl(tw),      series: [{ name: '2-Wheeler', data: vals(tw),      color: '#6366f1' }] },
      { title: 'Passenger Vehicle Reg.',     unit: 'units', labels: lbl(pvR),     series: [{ name: 'PV',        data: vals(pvR),     color: '#10b981' }] },
      { title: 'Commercial Vehicle Reg.',    unit: 'units', labels: lbl(cvR),     series: [{ name: 'CV',        data: vals(cvR),     color: '#f59e0b' }] },
      { title: '3-Wheeler Registrations',    unit: 'units', labels: lbl(thw),     series: [{ name: '3-Wheeler', data: vals(thw),     color: '#0ea5e9' }] },
      { title: 'Tractor Registrations',      unit: 'units', labels: lbl(tractor), series: [{ name: 'Tractor',   data: vals(tractor), color: '#ef4444' }] },
      { title: 'PV + CV Combined',           unit: 'units', labels: lbl(pvR),     series: [{ name: 'PV', data: vals(pvR), color: '#10b981' }, { name: 'CV', data: vals(cvR), color: '#f59e0b' }] },
      { title: '2W + 3W Combined',           unit: 'units', labels: lbl(tw),      series: [{ name: '2W', data: vals(tw),  color: '#6366f1' }, { name: '3W', data: vals(thw), color: '#8b5cf6' }] },
      { title: 'All Segments Overview',      unit: 'units', labels: lbl(pvR),     series: [{ name: 'PV', data: vals(pvR), color: '#10b981' }, { name: 'CV', data: vals(cvR), color: '#f59e0b' }, { name: '3W', data: vals(thw), color: '#8b5cf6' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  SERVICES & EXPORTS
  // ─────────────────────────────────────────────────────────────────────────
  const services = {
    id: 'services', label: 'Services & Exports',
    title: 'Services & Exports Dashboard',
    subtitle: "India's services PMI, service exports, merchandise exports, electronics goods, and PMI comparison",
    metrics: [
      { label: 'Services PMI',          value: String(safe(svcPmi)),                   change: kch(svcPmi, true)[0],  up: kch(svcPmi, true)[1] },
      { label: 'Service Exports ($M)',   value: `$${(safe(svcExp)/1000).toFixed(1)}B`,  change: kch(svcExp)[0],        up: kch(svcExp)[1] },
      { label: 'Merchandise Exports',   value: `$${(safe(mercExp)/1000).toFixed(1)}B`, change: kch(mercExp)[0],       up: kch(mercExp)[1] },
      { label: 'Composite PMI',         value: String(safe(pmiC)),                     change: kch(pmiC, true)[0],    up: kch(pmiC, true)[1] },
      { label: 'Trade Balance (Rs.B)',  value: `Rs.${safe(trade).toFixed(0)}B`,        change: kch(trade, true,'B')[0],up: kch(trade, true)[1] },
      { label: 'USD/INR',               value: `Rs.${safe(usdInr).toFixed(2)}`,        change: kch(usdInr, true)[0],  up: !kch(usdInr, true)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('Services PMI',          svcPmi),
      qr('Composite PMI',         pmiC),
      qr('Manufacturing PMI',     mfgPmi),
      qr('Service Exports ($M)',  svcExp,  x => x.toFixed(0)),
      qr('Merchandise Exports',   mercExp, x => x.toFixed(0)),
      qr('Electronics Goods',     elecExp, x => x.toFixed(0)),
    ],
    charts: [
      { title: 'Services PMI',              unit: 'index', labels: lbl(svcPmi),  series: [{ name: 'Services PMI',   data: vals(svcPmi),  color: '#6366f1' }] },
      { title: 'Service Exports ($M)',      unit: '$M',    labels: lbl(svcExp),  series: [{ name: 'Service Exports',data: vals(svcExp),  color: '#10b981' }] },
      { title: 'Merchandise Exports ($M)',  unit: '$M',    labels: lbl(mercExp), series: [{ name: 'Merch. Exports', data: vals(mercExp), color: '#f59e0b' }] },
      { title: 'Electronics Goods ($M)',    unit: '$M',    labels: lbl(elecExp), series: [{ name: 'Electronics',    data: vals(elecExp), color: '#14b8a6' }] },
      { title: 'PMI Comparison',            unit: 'index', labels: lbl(svcPmi),  series: [{ name: 'Services PMI', data: vals(svcPmi), color: '#6366f1' }, { name: 'Mfg PMI', data: vals(mfgPmi), color: '#f59e0b' }, { name: 'Composite PMI', data: vals(pmiC), color: '#10b981' }] },
      { title: 'India Trade Balance (Rs.B)',unit: 'Rs.B',  labels: lbl(trade),   series: [{ name: 'Trade Balance',  data: vals(trade),   color: '#ef4444' }] },
      { title: 'USD/INR Exchange Rate',     unit: 'Rs.',   labels: lbl(usdInr),  series: [{ name: 'USD/INR',        data: vals(usdInr),  color: '#f97316' }] },
      { title: 'DXY Dollar Index',          unit: 'index', labels: lbl(dxy),     series: [{ name: 'DXY',            data: vals(dxy),     color: '#64748b' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  BANKING & FINANCE
  // ─────────────────────────────────────────────────────────────────────────
  const banking = {
    id: 'banking', label: 'Banking & Finance',
    title: 'Banking & Finance Dashboard',
    subtitle: 'India banking — non-food credit, money supply, banking liquidity, and sectoral credit deployment',
    metrics: [
      { label: 'Non-Food Credit',        value: `Rs.${(safe(nfc)/10000000).toFixed(2)}L Cr`, change: kch(nfc)[0],       up: kch(nfc)[1] },
      { label: 'Money Supply M1',        value: `Rs.${(safe(ms)/10000000).toFixed(2)}L Cr`,  change: kch(ms)[0],        up: kch(ms)[1] },
      { label: 'Banking Liquidity',      value: `Rs.${safe(liq).toFixed(0)}B`,               change: kch(liq,true,'B')[0], up: safe(liq) > 0 },
      { label: 'Credit Card O/S',        value: `Rs.${(safe(cc)/100).toFixed(0)}Cr`,         change: kch(cc)[0],        up: kch(cc)[1] },
      { label: 'Vehicle Loans',          value: `Rs.${(safe(vehLoan)/100).toFixed(0)}Cr`,    change: kch(vehLoan)[0],   up: kch(vehLoan)[1] },
      { label: 'Gold Loans',             value: `Rs.${(safe(goldLoan)/100).toFixed(0)}Cr`,   change: kch(goldLoan)[0],  up: kch(goldLoan)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('Non-Food Credit (Rs.L Cr)',  nfc,     x => (x/10000000).toFixed(2)),
      qr('Money Supply M1 (Rs.L Cr)', ms,      x => (x/10000000).toFixed(2)),
      qr('Banking Liquidity (Rs.B)',   liq,     x => x.toFixed(0)),
      qr('Credit Card O/S (Rs.Cr)',    cc,      x => (x/100).toFixed(0)),
      qr('Vehicle Loans (Rs.Cr)',      vehLoan, x => (x/100).toFixed(0)),
      qr('Gold Loans (Rs.Cr)',         goldLoan,x => (x/100).toFixed(0)),
    ],
    charts: [
      { title: 'Non-Food Credit (Rs. Crore)',         unit: 'Rs.Cr', labels: lbl(nfc),     series: [{ name: 'Non-Food Credit',  data: vals(nfc),     color: '#6366f1' }] },
      { title: 'Money Supply M1 (Rs. Crore)',         unit: 'Rs.Cr', labels: lbl(ms),      series: [{ name: 'M1',               data: vals(ms),      color: '#10b981' }] },
      { title: 'Banking System Liquidity (Rs.B)',     unit: 'Rs.B',  labels: lbl(liq),     series: [{ name: 'Liquidity',         data: vals(liq),     color: '#ef4444' }] },
      { title: 'Credit Card Outstanding (Rs. Crore)', unit: 'Rs.Cr', labels: lbl(cc),      series: [{ name: 'CC Outstanding',    data: vals(cc),      color: '#f59e0b' }] },
      { title: 'Sectoral Credit (Rs. Crore)',         unit: 'Rs.Cr', labels: lbl(agri),    series: [{ name: 'Agriculture', data: vals(agri), color: '#10b981' }, { name: 'Industry', data: vals(indC), color: '#6366f1' }, { name: 'Services', data: vals(svcC), color: '#f59e0b' }] },
      { title: 'Vehicle Loans (Rs. Crore)',           unit: 'Rs.Cr', labels: lbl(vehLoan), series: [{ name: 'Vehicle Loans',     data: vals(vehLoan), color: '#8b5cf6' }] },
      { title: 'Gold Jewellery Loans (Rs. Crore)',    unit: 'Rs.Cr', labels: lbl(goldLoan),series: [{ name: 'Gold Loans',        data: vals(goldLoan),color: '#d97706' }] },
      { title: 'Personal Credit (Rs. Crore)',         unit: 'Rs.Cr', labels: lbl(personal),series: [{ name: 'Personal Credit',   data: vals(personal),color: '#be185d' }] },
      { title: 'Other Personal Loans (Rs. Crore)',    unit: 'Rs.Cr', labels: lbl(otherPL), series: [{ name: 'Other Pers. Loans', data: vals(otherPL), color: '#0ea5e9' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  COMMODITY PRICES
  // ─────────────────────────────────────────────────────────────────────────
  const commodities = {
    id: 'commodities', label: 'Commodity Prices',
    title: 'Commodity Prices Dashboard',
    subtitle: 'Real commodity prices — precious metals, base metals, energy, and freight',
    metrics: [
      { label: 'Gold (Rs./100g)',    value: `Rs.${(safe(goldC)/10).toFixed(0)}`,      change: kch(goldC)[0],  up: kch(goldC)[1] },
      { label: 'Silver (Rs.)',       value: `Rs.${(safe(silverC)/1000).toFixed(0)}K`, change: kch(silverC)[0],up: kch(silverC)[1] },
      { label: 'Copper (Rs./MT)',    value: `Rs.${(safe(copperC)/1000).toFixed(1)}K`, change: kch(copperC)[0],up: kch(copperC)[1] },
      { label: 'Aluminium (Rs./MT)',value: `Rs.${(safe(alumC)/1000).toFixed(1)}K`,   change: kch(alumC)[0],  up: kch(alumC)[1] },
      { label: 'Steel (Rs./MT)',     value: `Rs.${(safe(steelC)/1000).toFixed(1)}K`,  change: kch(steelC)[0], up: kch(steelC)[1] },
      { label: 'Lithium (Rs./MT)',   value: `Rs.${(safe(litC)/1000).toFixed(0)}K`,    change: kch(litC)[0],   up: kch(litC)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('Gold (Rs.)',         goldC,  x => x.toFixed(0)),
      qr('Silver (Rs.)',       silverC,x => x.toFixed(0)),
      qr('Copper (Rs./MT)',    copperC,x => x.toFixed(0)),
      qr('Aluminium (Rs./MT)',alumC,   x => x.toFixed(0)),
      qr('Steel (Rs./MT)',     steelC, x => x.toFixed(0)),
      qr('Lithium (Rs./MT)',   litC,   x => x.toFixed(0)),
    ],
    charts: [
      { title: 'Gold Price (Rs.)',           unit: 'Rs.',    labels: lbl(goldC),   series: [{ name: 'Gold',      data: vals(goldC),   color: '#d97706' }] },
      { title: 'Silver Price (Rs.)',         unit: 'Rs.',    labels: lbl(silverC), series: [{ name: 'Silver',    data: vals(silverC), color: '#64748b' }] },
      { title: 'Copper Price (Rs./MT)',      unit: 'Rs./MT', labels: lbl(copperC), series: [{ name: 'Copper',    data: vals(copperC), color: '#b45309' }] },
      { title: 'Aluminium Price (Rs./MT)',   unit: 'Rs./MT', labels: lbl(alumC),   series: [{ name: 'Aluminium', data: vals(alumC),   color: '#6366f1' }] },
      { title: 'Steel Price (Rs./MT)',       unit: 'Rs./MT', labels: lbl(steelC),  series: [{ name: 'Steel',     data: vals(steelC),  color: '#ef4444' }] },
      { title: 'Lithium Price (Rs./MT)',     unit: 'Rs./MT', labels: lbl(litC),    series: [{ name: 'Lithium',   data: vals(litC),    color: '#10b981' }] },
      { title: 'Iron Ore Price ($/MT)',      unit: '$/MT',   labels: lbl(ironC),   series: [{ name: 'Iron Ore',  data: vals(ironC),   color: '#8b5cf6' }] },
      { title: 'Baltic Dry Index (Freight)', unit: 'index',  labels: lbl(freightC),series: [{ name: 'BDI',       data: vals(freightC),color: '#0ea5e9' }] },
      { title: 'Cobalt Price',               unit: 'Rs.',    labels: lbl(cobaltC), series: [{ name: 'Cobalt',    data: vals(cobaltC), color: '#a855f7' }] },
      { title: 'Nickel Price (Rs./MT)',      unit: 'Rs./MT', labels: lbl(nickelC), series: [{ name: 'Nickel',    data: vals(nickelC), color: '#14b8a6' }] },
      { title: 'Zinc Price (Rs./MT)',        unit: 'Rs./MT', labels: lbl(zincC),   series: [{ name: 'Zinc',      data: vals(zincC),   color: '#f97316' }] },
      { title: 'Platinum Price',             unit: 'Rs.',    labels: lbl(platC),   series: [{ name: 'Platinum',  data: vals(platC),   color: '#94a3b8' }] },
      { title: 'Palladium Price',            unit: 'Rs.',    labels: lbl(palladC), series: [{ name: 'Palladium', data: vals(palladC), color: '#f43f5e' }] },
      { title: 'Tin Price',                  unit: 'Rs.',    labels: lbl(tinC),    series: [{ name: 'Tin',       data: vals(tinC),    color: '#22c55e' }] },
      { title: 'Precious Metals',            unit: 'Rs.',    labels: lbl(goldC),   series: [{ name: 'Gold', data: vals(goldC), color: '#d97706' }, { name: 'Silver', data: vals(silverC), color: '#64748b' }] },
      { title: 'Base Metals',                unit: 'Rs./MT', labels: lbl(copperC), series: [{ name: 'Copper', data: vals(copperC), color: '#b45309' }, { name: 'Aluminium', data: vals(alumC), color: '#6366f1' }, { name: 'Nickel', data: vals(nickelC), color: '#14b8a6' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  TREASURY YIELD
  // ─────────────────────────────────────────────────────────────────────────
  const treasury = {
    id: 'treasury', label: 'Treasury Yield',
    title: 'Global Treasury Yield Dashboard',
    subtitle: 'Sovereign bond yields — India, US, China & Japan — with yield spreads and currency rates',
    metrics: [
      { label: 'India 10Y (%)',      value: `${safe(in10y)}%`,  change: kch(in10y, true,'%')[0], up: !kch(in10y, true)[1] },
      { label: 'US 10Y (%)',         value: `${safe(us10y)}%`,  change: kch(us10y, true,'%')[0], up: !kch(us10y, true)[1] },
      { label: 'China 10Y (%)',      value: `${safe(cn10y)}%`,  change: kch(cn10y, true,'%')[0], up: !kch(cn10y, true)[1] },
      { label: 'Japan 10Y (%)',      value: `${safe(jp10y)}%`,  change: kch(jp10y, true,'%')[0], up: !kch(jp10y, true)[1] },
      { label: 'US 10Y-2Y Spread',   value: `${safe(usSp)}%`,  change: kch(usSp, true,'%')[0],  up: kch(usSp, true)[1] },
      { label: 'USD/INR',            value: `Rs.${safe(inrUsd).toFixed(2)}`, change: kch(inrUsd, true)[0], up: !kch(inrUsd, true)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('India 10Y (%)', in10y),
      qr('India 2Y (%)',  in2y),
      qr('US 10Y (%)',    us10y),
      qr('US 2Y (%)',     us2y),
      qr('China 10Y (%)', cn10y),
      qr('Japan 10Y (%)', jp10y),
    ],
    charts: [
      { title: 'India Treasury Yields (%)',       unit: '%',   labels: lbl(in10y),  series: [{ name: 'India 10Y', data: vals(in10y), color: '#6366f1' }, { name: 'India 2Y', data: vals(in2y), color: '#a5b4fc' }] },
      { title: 'US Treasury Yields (%)',          unit: '%',   labels: lbl(us10y),  series: [{ name: 'US 10Y',    data: vals(us10y), color: '#ef4444' }, { name: 'US 2Y',   data: vals(us2y), color: '#fca5a5' }] },
      { title: 'Global 10Y Yields (%)',           unit: '%',   labels: lbl(in10y),  series: [{ name: 'India', data: vals(in10y), color: '#6366f1' }, { name: 'US', data: vals(us10y), color: '#ef4444' }, { name: 'China', data: vals(cn10y), color: '#f59e0b' }, { name: 'Japan', data: vals(jp10y), color: '#10b981' }] },
      { title: 'US Yield Curve Spread 10Y-2Y',   unit: '%',   labels: lbl(usSp),   series: [{ name: 'US Spread',    data: vals(usSp),  color: '#8b5cf6' }] },
      { title: 'India Yield Spread 10Y-2Y',       unit: '%',   labels: lbl(inSp),   series: [{ name: 'India Spread', data: vals(inSp),  color: '#0ea5e9' }] },
      { title: 'China Yield Spread 10Y-2Y',       unit: '%',   labels: lbl(cnSp),   series: [{ name: 'China Spread', data: vals(cnSp),  color: '#f59e0b' }] },
      { title: 'Japan Yield Spread 10Y-2Y',       unit: '%',   labels: lbl(jpSp),   series: [{ name: 'Japan Spread', data: vals(jpSp),  color: '#10b981' }] },
      { title: 'USD/INR Rate',                    unit: 'Rs.', labels: lbl(inrUsd), series: [{ name: 'USD/INR',       data: vals(inrUsd),color: '#f97316' }] },
      { title: 'JPY/USD Rate',                    unit: 'JPY', labels: lbl(jpyUsd), series: [{ name: 'JPY/USD',       data: vals(jpyUsd),color: '#d97706' }] },
      { title: 'CNY/USD Rate',                    unit: 'CNY', labels: lbl(cnyUsd), series: [{ name: 'CNY/USD',       data: vals(cnyUsd),color: '#64748b' }] },
      { title: 'INR/Euro Rate',                   unit: 'Rs.', labels: lbl(inrEuro),series: [{ name: 'INR/Euro',      data: vals(inrEuro),color: '#a855f7' }] },
    ].filter(c => c.labels.length > 0),
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  EQUITY / INDICES
  // ─────────────────────────────────────────────────────────────────────────
  const equity = {
    id: 'equity', label: 'Equity / Indices',
    title: 'Global Equity & Indices Dashboard',
    subtitle: 'Nifty 50, NSE 500, S&P 500, Nasdaq, Nikkei, Shanghai, EURO STOXX 50 and more',
    metrics: [
      { label: 'Nifty 50',      value: `${safe(nifty50).toFixed(0)}`,  change: kch(nifty50)[0],  up: kch(nifty50)[1] },
      { label: 'NSE 500',       value: `${safe(nse500).toFixed(0)}`,   change: kch(nse500)[0],   up: kch(nse500)[1] },
      { label: 'S&P 500',       value: `${safe(sp500).toFixed(0)}`,    change: kch(sp500)[0],    up: kch(sp500)[1] },
      { label: 'Nasdaq',        value: `${safe(nasdaq).toFixed(0)}`,   change: kch(nasdaq)[0],   up: kch(nasdaq)[1] },
      { label: 'Nikkei 225',    value: `${safe(nikkei).toFixed(0)}`,   change: kch(nikkei)[0],   up: kch(nikkei)[1] },
      { label: 'EURO STOXX 50', value: `${safe(eurostoxx).toFixed(0)}`,change: kch(eurostoxx)[0],up: kch(eurostoxx)[1] },
    ],
    tableColumns: QC,
    tableRows: [
      qr('Nifty 50',       nifty50,   x => x.toFixed(0)),
      qr('NSE 500',        nse500,    x => x.toFixed(0)),
      qr('S&P 500',        sp500,     x => x.toFixed(0)),
      qr('Nasdaq',         nasdaq,    x => x.toFixed(0)),
      qr('Nikkei 225',     nikkei,    x => x.toFixed(0)),
      qr('EURO STOXX 50',  eurostoxx, x => x.toFixed(0)),
    ],
    charts: [
      { title: 'Nifty 50 Index',              unit: 'pts', labels: lbl(nifty50),   series: [{ name: 'Nifty 50',      data: vals(nifty50),   color: '#6366f1' }] },
      { title: 'NSE 500 Index',               unit: 'pts', labels: lbl(nse500),    series: [{ name: 'NSE 500',       data: vals(nse500),    color: '#8b5cf6' }] },
      { title: 'Nifty Midcap 150',            unit: 'pts', labels: lbl(midcap150), series: [{ name: 'Midcap 150',    data: vals(midcap150), color: '#0ea5e9' }] },
      { title: 'Nifty Midcap 100',            unit: 'pts', labels: lbl(midcap100), series: [{ name: 'Midcap 100',    data: vals(midcap100), color: '#14b8a6' }] },
      { title: 'Nifty Smallcap 250',          unit: 'pts', labels: lbl(smallcap250), series: [{ name: 'Smallcap 250', data: vals(smallcap250), color: '#a855f7' }] },
      { title: 'Nifty Smallcap 100',          unit: 'pts', labels: lbl(smallcap100), series: [{ name: 'Smallcap 100', data: vals(smallcap100), color: '#ec4899' }] },
      { title: 'Indian Indices Comparison',   unit: 'pts', labels: lbl(nifty50),   series: [{ name: 'Nifty 50', data: vals(nifty50), color: '#6366f1' }, { name: 'NSE 500', data: vals(nse500), color: '#8b5cf6' }] },
      { title: 'S&P 500 Index',               unit: 'pts', labels: lbl(sp500),     series: [{ name: 'S&P 500',       data: vals(sp500),     color: '#ef4444' }] },
      { title: 'Nasdaq Composite',            unit: 'pts', labels: lbl(nasdaq),    series: [{ name: 'Nasdaq',        data: vals(nasdaq),    color: '#f59e0b' }] },
      { title: 'Nikkei 225',                  unit: 'pts', labels: lbl(nikkei),    series: [{ name: 'Nikkei 225',    data: vals(nikkei),    color: '#10b981' }] },
      { title: 'TOPIX Index',                 unit: 'pts', labels: lbl(topix),     series: [{ name: 'TOPIX',         data: vals(topix),     color: '#22c55e' }] },
      { title: 'Shanghai Composite',          unit: 'pts', labels: lbl(shanghai),  series: [{ name: 'Shanghai',      data: vals(shanghai),  color: '#f97316' }] },
      { title: 'CSI 300 Index',               unit: 'pts', labels: lbl(csi300),    series: [{ name: 'CSI 300',       data: vals(csi300),    color: '#d97706' }] },
      { title: 'EURO STOXX 50',               unit: 'pts', labels: lbl(eurostoxx), series: [{ name: 'EURO STOXX 50', data: vals(eurostoxx), color: '#64748b' }] },
      { title: 'STOXX Europe 600',            unit: 'pts', labels: lbl(stoxxEur),  series: [{ name: 'STOXX 600',     data: vals(stoxxEur),  color: '#94a3b8' }] },
      { title: 'Global Indices Comparison',   unit: 'pts', labels: lbl(sp500),     series: [{ name: 'S&P 500', data: vals(sp500), color: '#ef4444' }, { name: 'Nasdaq', data: vals(nasdaq), color: '#f59e0b' }, { name: 'Nikkei', data: vals(nikkei), color: '#10b981' }] },
    ].filter(c => c.labels.length > 0),
  };

  const market = buildMarketSectorFromSeriesMap(
    buildSeriesMap(buildSummaryGrowthMetrics('market', allData))
  );

  const industries = [macro, industrial, transport, services, banking, commodities, treasury, market, equity].filter(Boolean);

  return industries.map((industry) => ({
    ...industry,
    summaryGrowthMetrics: buildSummaryGrowthMetrics(industry.id, allData),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTE  POST /api/upload/excel
// ─────────────────────────────────────────────────────────────────────────────
function parseWorkbookBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const allData = {};

  for (const sheetName of workbook.SheetNames) {
    allData[sheetName] = extractSeries(workbook.Sheets[sheetName]);
  }

  return {
    sheets: workbook.SheetNames,
    industries: buildDashboard(allData),
  };
}

function bootstrapDefaultData() {
  ensureDirs();

  if (fs.existsSync(DEFAULT_DATA_PATH)) {
    return;
  }

  const status = readStatus();
  const legacyRegistry = readRegistry();
  let industries = null;
  let defaultDataset = status.defaultDataset;

  if (legacyRegistry.active) {
    const legacyActivePath = path.join(ACTIVE_DIR, legacyRegistry.active.filename);
    if (fs.existsSync(legacyActivePath)) {
      industries = parseWorkbookBuffer(fs.readFileSync(legacyActivePath)).industries;
      defaultDataset = createDatasetMeta({
        filename: 'default_data.json',
        originalName: legacyRegistry.active.originalName,
        uploadedAt: legacyRegistry.active.uploadedAt,
        persistedAt: legacyRegistry.active.uploadedAt,
        size: legacyRegistry.active.size,
      });
    }
  }

  if (!industries) {
    const legacyRawData = readJson(LEGACY_DATA_PATH, null);
    if (legacyRawData) {
      industries = buildDashboard(legacyRawData);
      defaultDataset = createDatasetMeta({
        filename: 'default_data.json',
        originalName: 'dashboard_data.json',
        uploadedAt: new Date().toISOString(),
        persistedAt: new Date().toISOString(),
        size: Buffer.byteLength(JSON.stringify(industries)),
      });
    }
  }

  if (!industries) {
    throw new Error('No default dataset could be initialized');
  }

  writeJson(DEFAULT_DATA_PATH, industries);
  writeStatus({
    ...status,
    defaultDataset,
    tempDataset: status.tempDataset || null,
    backups: Array.isArray(status.backups) ? status.backups : [],
  });
}

function getStatusSnapshot() {
  bootstrapDefaultData();
  return readStatus();
}

function createBackupFromDefault(status, nowIso = new Date().toISOString()) {
  const currentDefault = readJson(DEFAULT_DATA_PATH, null);
  if (!currentDefault) {
    return null;
  }

  const backupId = safeTimestamp();
  const historyFilename = `${backupId}_backup_data.json`;
  writeJson(BACKUP_DATA_PATH, currentDefault);
  writeJson(path.join(HISTORY_DIR, historyFilename), currentDefault);

  return {
    id: backupId,
    filename: historyFilename,
    originalName: status.defaultDataset?.originalName || 'default_data.json',
    uploadedAt: status.defaultDataset?.uploadedAt || null,
    backedUpAt: nowIso,
    restoredAt: null,
    size: Buffer.byteLength(JSON.stringify(currentDefault)),
  };
}

function clearTempDataset(status) {
  const stagedFilename = status?.tempDataset?.stagedFilename;
  if (stagedFilename) {
    const stagedPath = path.join(TEMP_UPLOADS_DIR, stagedFilename);
    if (fs.existsSync(stagedPath)) {
      removeFileIfExists(stagedPath);
      appendOperationLog('staged_file_removed', {
        stagedFilename,
        originalName: status.tempDataset.originalName,
      });
    }
  }
  removeFileIfExists(TEMP_DATA_PATH);
  return {
    ...status,
    tempDataset: null,
  };
}


module.exports = { parseWorkbookBuffer, ensureMarketSectorInIndustries };
