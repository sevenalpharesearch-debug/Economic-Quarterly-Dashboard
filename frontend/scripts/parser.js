const XLSX = require('xlsx');
const SUMMARY_GROWTH_CONFIG = require('./config.js');
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


module.exports = { parseWorkbookBuffer, ensureMarketSectorInIndustries };
