from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics, reports

app = FastAPI(title="FinanceFlow MP - Servico de Analytics (Python)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrinja ao dominio do backend Node em producao
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"ok": True}
