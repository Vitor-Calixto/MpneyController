const express = require('express');
const prisma = require('../config/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Lista as contas do Mercado Pago conectadas pelo usuario logado
router.get('/', async (req, res) => {
  const accounts = await prisma.connectedAccount.findMany({
    where: { userId: req.userId },
    select: { id: true, accountLabel: true, mpEmail: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(accounts);
});

// Renomeia o apelido da conta (ex: "Loja Principal")
router.patch('/:id', async (req, res) => {
  const { accountLabel } = req.body;
  const result = await prisma.connectedAccount.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: { accountLabel },
  });
  res.json({ updated: result.count });
});

// "Desconectar" = marca como REVOKED (mantem o historico de transacoes)
router.delete('/:id', async (req, res) => {
  await prisma.connectedAccount.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: { status: 'REVOKED' },
  });
  res.json({ ok: true });
});

module.exports = router;
