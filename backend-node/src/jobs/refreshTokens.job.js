// Renova proativamente os access_tokens que estao perto de expirar (a cada 6h),
// como descrito na Etapa 4 do documento de especificacao.
const cron = require('node-cron');
const prisma = require('../config/prisma');
const { encryptToken, decryptToken } = require('../utils/crypto');
const mpService = require('../services/mercadoPago.service');

function startTokenRefreshJob() {
  cron.schedule('0 */6 * * *', async () => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiring = await prisma.connectedAccount.findMany({
      where: { status: 'ACTIVE', tokenExpiresAt: { lte: soon } },
    });

    for (const account of expiring) {
      try {
        const refreshToken = decryptToken(account.refreshToken);
        const data = await mpService.refreshAccessToken(refreshToken);
        await prisma.connectedAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encryptToken(data.access_token),
            refreshToken: encryptToken(data.refresh_token),
            tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
          },
        });
      } catch (err) {
        console.error(`Falha ao renovar token da conta ${account.id}:`, err.message);
        await prisma.connectedAccount.update({
          where: { id: account.id },
          data: { status: 'NEEDS_REAUTH' },
        });
      }
    }
  });
  console.log('Job de renovacao de tokens agendado (a cada 6h).');
}

module.exports = startTokenRefreshJob;
