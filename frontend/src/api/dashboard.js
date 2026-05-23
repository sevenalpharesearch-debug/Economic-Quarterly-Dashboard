export const getDashboardData = async () => {
  const response = await fetch('/data.json');
  if (!response.ok) {
    throw new Error('Failed to load static data');
  }
  const data = await response.json();
  return data;
};

// Mock other endpoints since there is no backend
export const getDatasetStatus = async () => ({
  success: true,
  defaultDataset: { originalName: 'Economic Quarterly data Final.xlsx', size: 0 },
  tempDataset: null,
  backups: [],
});
export const getBackups = getDatasetStatus;
export const uploadPreviewFile = async () => ({ success: false });
export const setDefaultDataset = async () => ({ success: false });
export const discardTempDataset = async () => ({ success: false });
export const restoreBackup = async () => ({ success: false });
export const deleteBackup = async () => ({ success: false });
