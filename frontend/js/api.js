// Wrapper fino em volta da Fetch API. Centraliza a base URL e o token JWT.
const API_BASE = window.FINANCEFLOW_API_BASE || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('ff_token');
}

function setSession(token, user) {
  localStorage.setItem('ff_token', token);
  localStorage.setItem('ff_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff_user');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisicao.');
  return data;
}

window.FF = { api, getToken, setSession, clearSession, requireAuth };
