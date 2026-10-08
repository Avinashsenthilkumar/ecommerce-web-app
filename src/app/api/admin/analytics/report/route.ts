import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getAdminSalesReport } from "@/lib/services/admin";

export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  const text = String(value);
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
    if (period !== "year" && (!Number.isInteger(year) || year < 2000 || year > new Date().getUTCFullYear())) {
      throw new ApiError(400, "Choose a valid report year.");
    }

    const report = await getAdminSalesReport(period, period === "year" ? undefined : year);
    const rows: Array<Array<string | number>> = [
      ["Record type", "Period", "Product", "Seller", "SKU", "Status", "Available stock", "Orders", "Units sold", "Revenue (INR)"],
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
      ]),
      ...report.products.map((product) => [
        "Product performance",
        period === "year" ? "All time" : String(year),
        product.name,
        product.seller,
        product.sku,
        product.status,
        product.stock,
        product.orders,
        product.unitsSold,
        product.revenue,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const filename = `store-sales-${period}${period === "year" ? "" : `-${year}`}.csv`;

    return new Response(`\uFEFF${csv}\r\n`, {
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
