# Motor de agregacao financeira (pandas) - Etapa 5 do documento de especificacao.
from fastapi import APIRouter
import pandas as pd

from schemas import CashFlowRequest, CategoryRequest

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/cash-flow")
def cash_flow(payload: CashFlowRequest):
    """Recebe as transacoes e devolve o fluxo de caixa diario + totais."""
    if not payload.transactions:
        return {"daily": [], "total_income": 0, "total_expense": 0, "balance": 0}

    df = pd.DataFrame([t.model_dump() for t in payload.transactions])
    df["date"] = pd.to_datetime(df["date"]).dt.date

    daily = (
        df.groupby(["date", "type"])["net_amount"]
        .sum()
        .unstack(fill_value=0)
        .reset_index()
    )
    daily["date"] = daily["date"].astype(str)

    total_income = df.loc[df["type"] == "INCOME", "net_amount"].sum()
    total_expense = df.loc[df["type"] == "EXPENSE", "net_amount"].sum()

    return {
        "daily": daily.to_dict(orient="records"),
        "total_income": round(float(total_income), 2),
        "total_expense": round(float(total_expense), 2),
        "balance": round(float(total_income - total_expense), 2),
    }


@router.post("/categories")
def categories(payload: CategoryRequest):
    """Agrupa receitas/despesas por categoria e calcula o percentual de impacto."""
    if not payload.transactions:
        return []

    df = pd.DataFrame([t.model_dump() for t in payload.transactions])
    df["category_name"] = df["category_name"].fillna("Sem categoria")

    total = df["net_amount"].abs().sum() or 1
    grouped = (
        df.groupby("category_name")["net_amount"]
        .apply(lambda s: s.abs().sum())
        .reset_index()
        .rename(columns={"net_amount": "total"})
    )
    grouped["percentual"] = (grouped["total"] / total * 100).round(2)

    return grouped.sort_values("total", ascending=False).to_dict(orient="records")
