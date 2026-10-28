FF.requireAuth();

const STATUS_LABEL = {
  ACTIVE: 'Ativo',
  NEEDS_REAUTH: 'Requer nova autorizacao',
  REVOKED: 'Desconectado',
};

async function loadAccounts() {
  const accounts = await FF.api('/accounts');
  const list = document.getElementById('accounts-list');
  const countEl = document.getElementById('accounts-count');

  const active = accounts.filter((a) => a.status !== 'REVOKED');
  countEl.textContent = active.length;

  if (active.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhuma conta conectada ainda. Clique em "Conectar nova conta" para comecar.</div>';
    return;
  }

  list.innerHTML = active.map((acc) => `
    <div class="account-row">
      <div class="account-info">
        <span class="label"><span class="status-dot ${acc.status.toLowerCase()}"></span>${acc.accountLabel}</span>
        <span class="email">${acc.mpEmail || ''} &middot; ${STATUS_LABEL[acc.status] || acc.status}</span>
      </div>
      <div class="account-actions">
        <button onclick="renameAccount('${acc.id}', '${acc.accountLabel.replace(/'/g, "\\'")}')">Editar</button>
        <button onclick="disconnectAccount('${acc.id}')">Desconectar</button>
      </div>
    </div>
  `).join('');
}

async function connectNewAccount() {
  const { url } = await FF.api('/auth/mp/connect');
  window.location.href = url;
}

async function renameAccount(id, currentLabel) {
  const novoNome = prompt('Novo apelido para a conta:', currentLabel);
  if (!novoNome) return;
  await FF.api(`/accounts/${id}`, { method: 'PATCH', body: { accountLabel: novoNome } });
  loadAccounts();
}

async function disconnectAccount(id) {
  if (!confirm('Desconectar esta conta? O historico de transacoes sera mantido.')) return;
  await FF.api(`/accounts/${id}`, { method: 'DELETE' });
  loadAccounts();
}

// Mensagem apos retorno do fluxo OAuth (accounts.html?status=success|error)
(function showOAuthFeedback() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  if (!status) return;
  const banner = document.getElementById('oauth-feedback');
  if (status === 'success') {
    banner.textContent = 'Conta conectada com sucesso!';
    banner.style.display = 'block';
  } else if (status === 'error') {
    banner.textContent = 'Nao foi possivel conectar a conta. Tente novamente.';
    banner.style.display = 'block';
    banner.style.color = 'var(--danger)';
  }
  window.history.replaceState({}, '', 'accounts.html');
})();

loadAccounts();
