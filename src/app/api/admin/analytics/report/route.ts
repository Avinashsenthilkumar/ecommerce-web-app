import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import {
  getAdminSalesReport,
  getSellerSales,
  periodRange,
} from "@/lib/services/admin";

export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  const text = String(value);
  // Stop spreadsheets treating a leading =,+,-,@ as a formula.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const params = new URL(request.url).searchParams;
    const period = params.get("period");
    if (period !== "day" && period !== "month" && period !== "year") {
      throw new ApiError(400, "Choose a daily, monthly, or yearly report.");
    }

    const rawYear = params.get("year");
    const year = rawYear === null ? new Date().getUTCFullYear() : Number(rawYear);
    if (
      period !== "year" &&
      (!Number.isInteger(year) || year < 2000 || year > new Date().getUTCFullYear())
    ) {
      throw new ApiError(400, "Choose a valid report year.");
    }

    // Optional: restrict seller totals to one day / month / year, e.g. 2026-10-08.
    const focus = params.get("on");
    const range = focus ? periodRange(focus) : null;
    if (focus && !range) {
      throw new ApiError(400, "Use a date like 2026, 2026-10 or 2026-10-08.");
    }

    const [report, sellers] = await Promise.all([
      getAdminSalesReport(period, period === "year" ? undefined : year),
      getSellerSales(range ?? undefined),
    ]);

    // The on-screen report reads JSON; the download gets CSV.
    if (params.get("format") === "json") {
      return Response.json({
        ok: true,
        data: {
          period,
          year: period === "year" ? null : year,
          on: focus ?? null,
          periods: report.periods,
          products: report.products,
          sellers: sellers.rows,
          sellerTotals: sellers.totals,
          totals: report.periods.reduce(
            (acc, row) => ({
              orders: acc.orders + row.orders,
              unitsSold: acc.unitsSold + row.unitsSold,
              revenue: acc.revenue + row.revenue,
            }),
            { orders: 0, unitsSold: 0, revenue: 0 },
          ),
        },
      });
    }

    const scope = period === "year" ? "All time" : String(year);
    const rows: Array<Array<string | number>> = [
      [
        "Record type",
        "Period",
        "Name",
        "Seller",
        "SKU",
        "Status",
        "Available stock",
        "Orders",
        "Units sold",
        "Revenue (INR)",
        "Commission (INR)",
        "Seller payout (INR)",
      ],
      ...report.periods.map((row) => [
        "Sales summary",
        row.period,
        "",
        "",
        "",
        "",
        "",
        row.orders,
        row.unitsSold,
        row.revenue,
        "",
        "",
      ]),
      ...sellers.rows.map((seller) => [
        "Seller performance",
        focus ?? scope,
        seller.seller,
        seller.seller,
        "",
        seller.status,
        "",
        seller.orders,
        seller.unitsSold,
        seller.revenue,
        seller.commission,
        seller.payout,
      ]),
      ...report.products.map((product) => [
        "Product performance",
        scope,
        product.name,
        product.seller,
        product.sku,
        product.status,
        product.stock,
        product.orders,
        product.unitsSold,
        product.revenue,
        "",
        "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const filename = `store-sales-${period}${period === "year" ? "" : `-${year}`}.csv`;

    return new Response(`﻿${csv}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json(
      { ok: false, error: "Unable to generate the sales report. Check the server logs." },
      { status: 500 },
    );
  }
}
