import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getVendorSalesReport } from "@/lib/services/vendor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole(["VENDOR"], { allowAdmin: false });
    if (!user.vendor || user.vendor.status !== "APPROVED") {
      throw new ApiError(403, "An approved seller account is required to download reports.");
    }

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

    const rows = await getVendorSalesReport(
      user.vendor.id,
      period,
      period === "year" ? undefined : year,
    );
    const csv = [
      ["Period", "Orders", "Units sold", "Revenue (INR)"],
      ...rows.map((row) => [row.period, row.orders, row.unitsSold, row.revenue]),
    ]
      .map((row) => row.join(","))
      .join("\r\n");
    const filename = `seller-sales-${period}${period === "year" ? "" : `-${year}`}.csv`;

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
