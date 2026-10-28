# FinanceFlow MP

Controle financeiro multi-conta com integração via OAuth 2.0 ao Mercado Pago.
Implementação inicial baseada no documento de especificação: gateway em
Node.js (autenticação, OAuth, webhooks), serviço de analytics em Python
(FastAPI + pandas) e front-end em HTML/CSS/JS com Chart.js.

```
financeflow-mp/
├── docker-compose.yml
├── backend-node/      → API Gateway (Express, Prisma, OAuth, webhooks)
├── backend-python/     → Serviço de analytics (FastAPI, pandas, relatórios)
└── frontend/           → Dashboard (HTML/CSS/JS + Chart.js)
```

## O que já está funcionando

- Cadastro/login de usuários da plataforma (JWT).
- Fluxo OAuth 2.0 completo com o Mercado Pago: `/connect` → redireciona para
  o Mercado Pago → `/callback` troca o `code` por tokens → tokens salvos
  **criptografados** (AES-256-GCM) na tabela `connected_accounts`.
- Endpoint de webhook que recebe `payment.created`/`payment.updated` e
  grava a transação no banco.
- Job agendado (a cada 6h) que renova tokens perto de expirar.
- Serviço Python com `/analytics/cash-flow`, `/analytics/categories` e
  `/reports/export-excel` (gera `.xlsx` com pandas).
- Dashboard com seletor de conta, cards de métricas, gráfico de fluxo de
  caixa, gráfico por categoria, tabela de transações e tema claro/escuro.
- Tela "Minhas Contas Conectadas" com o guia passo a passo do documento.

## O que foi simplificado (próximos passos)

O documento original é um projeto grande; esta primeira versão cobre a
arquitetura completa e os fluxos principais, mas alguns pontos ficaram
propositalmente simples para você evoluir:

- O `state` do OAuth é guardado em memória (`Map`) — troque por Redis ou uma
  tabela no banco antes de rodar com mais de uma instância do backend.
- O webhook identifica a conta pelo `user_id` enviado na query string da URL
  cadastrada no painel do Mercado Pago — confirme esse formato com a
  documentação deles ao configurar, pois pode variar.
- Não há tela de categorização manual de transações nem CRUD completo de
  metas — os endpoints (`/goals`) já existem, falta a interface.
- `reports/export-excel` gera um Excel simples; o PDF com ReportLab
  (mencionado no documento) ainda não foi implementado.
- Sem testes automatizados.

## Como rodar localmente

### 1. Pré-requisitos
- Docker e Docker Compose (mais simples), **ou** Node 18+, Python 3.11+ e
  PostgreSQL instalados manualmente.

### 2. Credenciais do Mercado Pago
1. Crie uma aplicação em
   [mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app).
2. Copie o `Client ID` e o `Client Secret`.
3. Nas configurações da aplicação, registre a Redirect URI:
   `http://localhost:4000/api/auth/mp/callback` (ajuste o domínio em produção).

### 3. Configurar variáveis de ambiente
```bash
cd backend-node
cp .env.example .env
# edite .env e preencha MP_CLIENT_ID, MP_CLIENT_SECRET, JWT_SECRET
# gere a chave de criptografia dos tokens:
openssl rand -hex 32   # cole o resultado em TOKEN_ENCRYPTION_KEY
```

### 4. Subir tudo com Docker Compose
```bash
docker compose up --build
```
Isso sobe Postgres (5432), API Node (4000), serviço Python (8000) e o
front-end estático servido pelo Nginx (5173).

Depois de subir, rode as migrações do Prisma uma vez:
```bash
docker compose exec backend-node npx prisma migrate dev --name init
```

### 5. Sem Docker (manual)
```bash
# banco
createdb financeflow

# backend node
cd backend-node
npm install
npx prisma migrate dev --name init
npm run dev          # http://localhost:4000

# backend python (em outro terminal)
cd backend-python
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# frontend (em outro terminal) — qualquer servidor estático funciona
cd frontend
python3 -m http.server 5173
```

Acesse `http://localhost:5173/register.html` para criar o primeiro usuário.

## Testando o fluxo de OAuth e os webhooks localmente

A API do Mercado Pago precisa conseguir alcançar sua máquina para enviar os
webhooks — `localhost` não é acessível pela internet. Para testar localmente:

1. Instale o [ngrok](https://ngrok.com/) (ou similar) e exponha a porta 4000:
   `ngrok http 4000`.
2. Troque `MP_REDIRECT_URI` no `.env` e a Redirect URI no painel do Mercado
   Pago pela URL pública do ngrok + `/api/auth/mp/callback`.
3. Configure a URL de notificações webhook no painel do Mercado Pago como
   `https://SEU-NGROK.ngrok.app/api/webhooks/mercadopago`.
4. Use as [credenciais de teste](https://www.mercadopago.com.br/developers/panel/test-users)
   do Mercado Pago para simular pagamentos sem usar dinheiro real.

## Deploy em produção (sugestão, conforme o documento)

- **Node + Python**: containers Docker separados em Render, Railway ou AWS
  App Runner.
- **Banco de dados**: Postgres gerenciado (Supabase, Render Postgres, AWS RDS).
- **Front-end**: Vercel, Netlify ou Cloudflare Pages.
- Troque `FRONTEND_URL`, `MP_REDIRECT_URI` e os valores de `window.FINANCEFLOW_API_BASE`
  / `window.FINANCEFLOW_PY_BASE` (no topo de cada página, se quiser fixá-los)
  para os domínios reais.
- Nunca commite o arquivo `.env` — ele já está no `.gitignore`.

## Segurança

- `access_token` e `refresh_token` nunca são salvos em texto puro — passam
  por AES-256-GCM antes de ir para o banco (`backend-node/src/utils/crypto.js`).
- O app nunca pede a senha do Mercado Pago do usuário — toda a autorização
  acontece na página oficial do Mercado Pago (OAuth 2.0).
- Em produção, restrinja o CORS (`allow_origins` no FastAPI e `cors()` no
  Express) ao domínio real do front-end, em vez de `*`.
