// Wrapper fino em volta da API do Mercado Pago.
const axios = require('axios');

const MP_API_BASE = 'https://api.mercadopago.com';
const MP_AUTH_BASE = 'https://auth.mercadopago.com.br';

function buildAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: process.env.MP_REDIRECT_URI,
  });
  return `${MP_AUTH_BASE}/authorization?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const { data } = await axios.post(`${MP_API_BASE}/oauth/token`, {
    grant_type: 'authorization_code',
    client_id: process.env.MP_CLIENT_ID,
    client_secret: process.env.MP_CLIENT_SECRET,
    code,
    redirect_uri: process.env.MP_REDIRECT_URI,
  });
  return data; // { access_token, refresh_token, expires_in, user_id, ... }
}

async function refreshAccessToken(refreshToken) {
  const { data } = await axios.post(`${MP_API_BASE}/oauth/token`, {
    grant_type: 'refresh_token',
    client_id: process.env.MP_CLIENT_ID,
    client_secret: process.env.MP_CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  return data;
}

async function getPayment(paymentId, accessToken) {
  const { data } = await axios.get(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function getUserInfo(accessToken) {
  const { data } = await axios.get(`${MP_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

module.exports = {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getPayment,
  getUserInfo,
};
