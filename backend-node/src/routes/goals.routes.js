const express = require('express');
const prisma = require('../config/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const goals = await prisma.goal.findMany({ where: { userId: req.userId } });
  res.json(goals);
});

router.post('/', async (req, res) => {
  const { title, targetAmount, deadline } = req.body;
  const goal = await prisma.goal.create({
    data: {
      userId: req.userId,
      title,
      targetAmount,
      deadline: deadline ? new Date(deadline) : null,
    },
  });
  res.status(201).json(goal);
});

module.exports = router;
