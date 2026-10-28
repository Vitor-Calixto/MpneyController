# Exportacao de relatorios - Etapa 5 do documento de especificacao.
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import pandas as pd
import io

from schemas import CashFlowRequest

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/export-excel")
def export_excel(payload: CashFlowRequest):
    """Gera um .xlsx com a lista de transacoes e um resumo por tipo."""
    df = pd.DataFrame([t.model_dump() for t in payload.transactions])

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Transacoes", index=False)

        if not df.empty:
            resumo = (
                df.groupby("type")["net_amount"]
                .sum()
                .reset_index()
                .rename(columns={"type": "Tipo", "net_amount": "Total"})
            )
            resumo.to_excel(writer, sheet_name="Resumo", index=False)

    buffer.seek(0)
    headers = {"Content-Disposition": "attachment; filename=relatorio_financeiro.xlsx"}
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
