from io import BytesIO
from datetime import datetime
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)

from app.models.domain import (
    Raffle, User, Ticket, TicketNumber, CustomerPurchase
)


class ReportController:
    @staticmethod
    def build_raffle_pdf(raffle_id: UUID, db: Session) -> tuple[BytesIO, str]:
        raffle = db.query(Raffle).filter(Raffle.id == raffle_id).first()
        if not raffle:
            raise HTTPException(status_code=404, detail="Rifa no encontrada.")

        organizer = db.query(User).filter(User.id == raffle.organizer_id).first()
        tickets = (
            db.query(Ticket)
            .filter(Ticket.raffle_id == raffle.id)
            .order_by(Ticket.ticket_code.asc())
            .all()
        )
        purchases = (
            db.query(CustomerPurchase)
            .filter(CustomerPurchase.raffle_id == raffle.id)
            .all()
        )
        purchase_by_ticket = {str(p.ticket_id): p for p in purchases}

        customer_ids = [p.customer_id for p in purchases if p.customer_id]
        customers = (
            db.query(User).filter(User.id.in_(customer_ids)).all()
            if customer_ids
            else []
        )
        customer_map = {str(c.id): c for c in customers}

        total_tickets = len(tickets)
        paid_count = sum(1 for t in tickets if t.status == "PAID")
        reserved_count = sum(1 for t in tickets if t.status == "RESERVED")
        avail_count = total_tickets - (paid_count + reserved_count)
        sold_pct = round(((paid_count + reserved_count) / total_tickets * 100), 1) if total_tickets > 0 else 0.0

        total_budget = float(raffle.ticket_price) * total_tickets
        total_collected = sum(float(p.balance_paid or 0.0) for p in purchases)
        total_committed = sum(float(p.total_amount or 0.0) for p in purchases)
        pending_balance = max(0.0, total_committed - total_collected)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
            title=f"Reporte Oficial - {raffle.title}",
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CosiTitle",
            parent=styles["Heading1"],
            fontSize=16,
            textColor=colors.HexColor("#111827"),
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            "CosiSubtitle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#4B5563"),
            spaceAfter=12,
        )
        section_style = ParagraphStyle(
            "CosiSection",
            parent=styles["Heading2"],
            fontSize=11,
            textColor=colors.HexColor("#4F46E5"),
            spaceBefore=12,
            spaceAfter=6,
        )

        elements = []

        # 1. Encabezado Institucional
        generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        elements.append(Paragraph(f"CosiTickets • Reporte Ejecutivo de Rifa", title_style))
        elements.append(
            Paragraph(
                f"<b>{raffle.title}</b> | Generado el {generated_at}",
                subtitle_style,
            )
        )

        # 2. Ficha Técnica General
        elements.append(Paragraph("1. Ficha General del Sorteo", section_style))
        meta_data = [
            ["Premio Principal:", raffle.prize_name, "Valor Boleto:", f"${float(raffle.ticket_price):,.0f} COP"],
            ["Responsable:", organizer.name if organizer else "N/A", "Contacto:", (organizer.phone or organizer.email) if organizer else "N/A"],
            ["Fecha de Cierre:", raffle.draw_date.strftime("%Y-%m-%d"), "Estado Actual:", raffle.status],
            ["Núm. por Boleto:", str(raffle.numbers_per_ticket), "Número Ganador:", raffle.winning_number or "Pendiente por sortear"],
        ]
        meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.3 * inch, 2.3 * inch])
        meta_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F3F4F6")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(meta_table)

        # 3. Resumen de Avance y Recaudo
        elements.append(Paragraph("2. Avance de Ventas y Resumen Financiero", section_style))
        kpi_data = [
            ["Total Boletos", "Disponibles", "Apartados / Abono", "Pagados", "% Ocupación"],
            [str(total_tickets), str(avail_count), str(reserved_count), str(paid_count), f"{sold_pct}%"],
            ["Meta Presupuestada", "Recaudo Efectivo", "Cartera por Cobrar", "Costo Premio", "Balance Neto"],
            [
                f"${total_budget:,.0f}",
                f"${total_collected:,.0f}",
                f"${pending_balance:,.0f}",
                f"${float(raffle.prize_cost or 0):,.0f}",
                f"${(total_collected - float(raffle.prize_cost or 0)):,.0f}",
            ],
        ]
        kpi_table = Table(kpi_data, colWidths=[1.44 * inch] * 5)
        kpi_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#1F2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("TEXTCOLOR", (0, 2), (-1, 2), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(kpi_table)

        # 4. Matriz Visual del Tablero
        elements.append(Paragraph("3. Mapa Visual del Tablero (Verde: Libre | Amarillo: Apartado | Rojo: Pagado)", section_style))

        cols = 10
        board_rows = []
        cell_styles = [
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9CA3AF")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]

        buyer_rows = [["Boleto", "Números", "Estado", "Comprador", "Teléfono", "Abonado", "Saldo"]]

        for idx, t in enumerate(tickets):
            nums = [
                n.number_value
                for n in db.query(TicketNumber).filter(TicketNumber.ticket_id == t.id).all()
            ]
            nums_label = "-".join(nums) if nums else t.ticket_code
            r_idx = idx // cols
            c_idx = idx % cols

            if idx % cols == 0:
                board_rows.append([])
            board_rows[-1].append(f"{nums_label}\n({t.status[0]})")

            if t.status == "PAID":
                bg = colors.HexColor("#FECACA")
                fg = colors.HexColor("#991B1B")
            elif t.status == "RESERVED":
                bg = colors.HexColor("#FEF08A")
                fg = colors.HexColor("#854D0E")
            else:
                bg = colors.HexColor("#DCFCE7")
                fg = colors.HexColor("#166534")

            cell_styles.append(("BACKGROUND", (c_idx, r_idx), (c_idx, r_idx), bg))
            cell_styles.append(("TEXTCOLOR", (c_idx, r_idx), (c_idx, r_idx), fg))

            if t.status in ("RESERVED", "PAID"):
                purchase = purchase_by_ticket.get(str(t.id))
                cust = customer_map.get(str(purchase.customer_id)) if purchase else None
                paid_val = float(purchase.balance_paid or 0.0) if purchase else 0.0
                tot_val = float(purchase.total_amount or raffle.ticket_price) if purchase else float(raffle.ticket_price)
                bal_val = max(0.0, tot_val - paid_val)

                buyer_rows.append([
                    t.ticket_code,
                    ", ".join(nums),
                    "PAGADO" if t.status == "PAID" else "APARTADO",
                    cust.name if cust else "Sin asignar",
                    (cust.phone or "N/A") if cust else "N/A",
                    f"${paid_val:,.0f}",
                    f"${bal_val:,.0f}",
                ])

        # Completar última fila si no es múltiplo de 10
        if board_rows and len(board_rows[-1]) < cols:
            board_rows[-1].extend([""] * (cols - len(board_rows[-1])))

        if board_rows:
            board_table = Table(board_rows, colWidths=[0.72 * inch] * cols)
            board_table.setStyle(TableStyle(cell_styles))
            elements.append(board_table)

        # 5. Relación de Participantes y Cartera
        if len(buyer_rows) > 1:
            elements.append(Spacer(1, 8))
            elements.append(Paragraph("4. Detalle de Boletos Apartados y Pagados", section_style))
            buyers_table = Table(
                buyer_rows,
                colWidths=[0.75 * inch, 0.95 * inch, 0.85 * inch, 1.75 * inch, 1.1 * inch, 0.9 * inch, 0.9 * inch],
                repeatRows=1,
            )
            buyers_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                    ("ALIGN", (5, 1), (6, -1), "RIGHT"),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ])
            )
            elements.append(buyers_table)

        doc.build(elements)
        buffer.seek(0)
        safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in raffle.title).strip("_")
        filename = f"CosiTickets_{safe_name or 'Rifa'}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        return buffer, filename