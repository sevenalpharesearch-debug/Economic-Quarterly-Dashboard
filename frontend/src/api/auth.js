// ─────────────────────────────────────────────
//  AUTH API  —  connects to backend /api/auth/*
// ─────────────────────────────────────────────
import api from './axios';

export const registerUser = async ({ name, email, password }) => {
  const { data } = await api.post('/auth/register', { name, email, password });
  if (data.token) localStorage.setItem('token', data.token);
  return data;
};

export const loginUser = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.token) localStorage.setItem('token', data.token);
  return data;
};

export const logoutUser = async () => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};
