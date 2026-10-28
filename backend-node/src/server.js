require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const mpOAuthRoutes = require('./routes/mpOAuth.routes');
const accountsRoutes = require('./routes/accounts.routes');
const transactionsRoutes = require('./routes/transactions.routes');
const goalsRoutes = require('./routes/goals.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const startTokenRefreshJob = require('./jobs/refreshTokens.job');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);      // /register, /login
app.use('/api/auth', mpOAuthRoutes);   // /mp/connect, /mp/callback
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/webhooks', webhooksRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FinanceFlow MP (Node) rodando na porta ${PORT}`);
  startTokenRefreshJob();
});
