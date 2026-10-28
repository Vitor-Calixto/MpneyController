const express = require('express');
const prisma = require('../config/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Lista transacoes do usuario, com filtro opcional por conta e periodo
// (usado pelo seletor global "Todas as Contas" do header)
router.get('/', async (req, res) => {
  const { accountId, from, to } = req.query;

  const accounts = await prisma.connectedAccount.findMany({
    where: { userId: req.userId, ...(accountId ? { id: accountId } : {}) },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { category: true },
    orderBy: { date: 'desc' },
  });

  res.json(transactions);
});

module.exports = router;
