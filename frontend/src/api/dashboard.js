import api from './axios';

export const getDashboardData = async () => {
  const { data } = await api.get('/upload/data');
  return data;
};

export const getDatasetStatus = async () => {
  const { data } = await api.get('/upload/status');
  return data;
};

export const uploadPreviewFile = async (formData) => {
  const { data } = await api.post('/upload/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const setDefaultDataset = async () => {
  const { data } = await api.post('/upload/set-default');
  return data;
};

export const discardTempDataset = async () => {
  const { data } = await api.post('/upload/discard-temp');
  return data;
};

export const restoreBackup = async (backupId) => {
  const { data } = await api.post('/upload/restore-backup', { backupId });
  return data;
};

export const deleteBackup = async (backupId) => {
  const { data } = await api.post('/upload/delete-backup', { backupId });
  return data;
};

export const getBackups = getDatasetStatus;
