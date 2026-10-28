// Recebe as notificacoes payment.created / payment.updated do Mercado Pago.
const express = require('express');
const prisma = require('../config/prisma');
const { decryptToken } = require('../utils/crypto');
const mpService = require('../services/mercadoPago.service');

const router = express.Router();

router.post('/mercadopago', async (req, res) => {
  // Responde rapido para o Mercado Pago nao reenviar a notificacao
  res.sendStatus(200);

  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    // O Mercado Pago envia o user_id do vendedor como query param na URL do webhook.
    // Configure a URL do webhook no painel como: SEU_DOMINIO/api/webhooks/mercadopago?user_id={mp_user_id}
    const mpUserId = req.query.user_id;
    const account = await prisma.connectedAccount.findFirst({
      where: { mpUserId: String(mpUserId), status: 'ACTIVE' },
    });
    if (!account) return;

    const accessToken = decryptToken(account.accessToken);
    const payment = await mpService.getPayment(data.id, accessToken);

    const fees = (payment.fee_details || []).reduce((sum, f) => sum + f.amount, 0);

    await prisma.transaction.upsert({
      where: { mpTransactionId: String(payment.id) },
      update: {
        status: payment.status,
        amount: payment.transaction_amount,
        netAmount: payment.transaction_amount - fees,
      },
      create: {
        accountId: account.id,
        mpTransactionId: String(payment.id),
        description: payment.description || payment.statement_descriptor || '',
        amount: payment.transaction_amount,
        netAmount: payment.transaction_amount - fees,
        type: payment.transaction_amount >= 0 ? 'INCOME' : 'EXPENSE',
        status: payment.status,
        date: new Date(payment.date_created),
      },
    });
  } catch (err) {
    console.error('Erro processando webhook do Mercado Pago:', err.message);
  }
});

module.exports = router;
