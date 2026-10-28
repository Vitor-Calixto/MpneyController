// Fluxo OAuth 2.0 de conexao com o Mercado Pago (passo 1 ao 12 do diagrama do projeto).
const express = require('express');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const authMiddleware = require('../middleware/auth');
const { encryptToken } = require('../utils/crypto');
const mpService = require('../services/mercadoPago.service');

const router = express.Router();

// Em producao, troque este Map por Redis (ou tabela no banco com expiracao),
// ja que em memoria ele nao sobrevive a reinicios nem funciona com varias instancias.
const stateStore = new Map();

// 1-3: usuario clica "Conectar" -> front pede a URL de autorizacao
router.get('/mp/connect', authMiddleware, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, req.userId);
  const url = mpService.buildAuthorizationUrl(state);
  return res.json({ url });
});

// 7-12: Mercado Pago redireciona de volta com ?code=...&state=...
router.get('/mp/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = stateStore.get(state);
  if (!userId) {
    return res.status(400).send('State invalido ou expirado. Tente conectar novamente.');
  }
  stateStore.delete(state);

  try {
    const tokenData = await mpService.exchangeCodeForToken(code);
    const userInfo = await mpService.getUserInfo(tokenData.access_token);

    await prisma.connectedAccount.create({
      data: {
        userId,
        accountLabel: userInfo.nickname || `Conta MP ${userInfo.id}`,
        mpUserId: String(userInfo.id),
        mpEmail: userInfo.email || '',
        accessToken: encryptToken(tokenData.access_token),
        refreshToken: encryptToken(tokenData.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        status: 'ACTIVE',
      },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/accounts.html?status=success`);
  } catch (err) {
    console.error('Erro no callback do Mercado Pago:', err.response?.data || err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/accounts.html?status=error`);
  }
});

module.exports = router;
