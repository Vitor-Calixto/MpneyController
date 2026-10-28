FF.requireAuth();

const user = JSON.parse(localStorage.getItem('ff_user') || '{}');
document.getElementById('user-greeting').textContent = user.name ? `Ola, ${user.name}` : '';

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let cashFlowChart, categoryChart;

async function populateAccountSelect() {
  const accounts = await FF.api('/accounts');
  const select = document.getElementById('account-select');
  select.innerHTML = '<option value="">Todas as contas</option>' +
    accounts
      .filter((a) => a.status === 'ACTIVE')
      .map((a) => `<option value="${a.id}">${a.accountLabel}</option>`)
      .join('');
  select.addEventListener('change', () => loadDashboard(select.value));
}

async function loadDashboard(accountId = '') {
  const query = accountId ? `?accountId=${accountId}` : '';
  const transactions = await FF.api(`/transactions${query}`);

  renderMetrics(transactions);
  renderTransactionsTable(transactions);
  await renderCashFlowChart(transactions);
  await renderCategoryChart(transactions);
}

function renderMetrics(transactions) {
  const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.netAmount), 0);
  const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.netAmount), 0);

  document.getElementById('metric-income').textContent = currencyFmt.format(income);
  document.getElementById('metric-expense').textContent = currencyFmt.format(expense);
  document.getElementById('metric-balance').textContent = currencyFmt.format(income - expense);
}

function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transactions-body');
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma transacao ainda. Conecte uma conta para comecar a sincronizar.</td></tr>';
    return;
  }
  tbody.innerHTML = transactions.slice(0, 20).map((t) => `
    <tr>
      <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
      <td>${t.description || '-'}</td>
      <td>${t.category ? t.category.name : 'Sem categoria'}</td>
      <td><span class="badge ${t.status}">${t.status}</span></td>
      <td class="num ${t.type === 'INCOME' ? 'positive' : 'negative'}">
        ${t.type === 'INCOME' ? '+' : '-'} ${currencyFmt.format(Math.abs(Number(t.netAmount)))}
      </td>
    </tr>
  `).join('');
}

// As rotas /analytics/* rodam no servico Python (FastAPI), que recebe as
// transacoes ja carregadas do Node e devolve os calculos agregados.
async function callPythonAnalytics(path, transactions) {
  const base = window.FINANCEFLOW_PY_BASE || 'http://localhost:8000';
  const payload = {
    transactions: transactions.map((t) => ({
      id: t.id,
      account_id: t.accountId,
      amount: Number(t.amount),
      net_amount: Number(t.netAmount),
      type: t.type,
      status: t.status,
      category_name: t.category ? t.category.name : null,
      date: t.date,
    })),
  };
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function renderCashFlowChart(transactions) {
  const data = await callPythonAnalytics('/analytics/cash-flow', transactions);
  const labels = (data.daily || []).map((d) => d.date);
  const income = (data.daily || []).map((d) => d.INCOME || 0);
  const expense = (data.daily || []).map((d) => d.EXPENSE || 0);

  if (cashFlowChart) cashFlowChart.destroy();
  cashFlowChart = new Chart(document.getElementById('cashFlowChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Entradas', data: income, borderColor: '#10B981', backgroundColor: 'transparent', tension: 0.3 },
        { label: 'Saidas', data: expense, borderColor: '#EF4444', backgroundColor: 'transparent', tension: 0.3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

async function renderCategoryChart(transactions) {
  const data = await callPythonAnalytics('/analytics/categories', transactions);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.category_name),
      datasets: [{
        data: data.map((d) => d.total),
        backgroundColor: ['#009EE3', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#64748B'],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function logout() {
  FF.clearSession();
  window.location.href = 'login.html';
}

populateAccountSelect();
loadDashboard();
