import { NextResponse } from "next/server";
import { getFounderIntroductions } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {
  const founders = getFounderIntroductions();

  const rows = founders.map((intro) => ({
    "Contact Name": intro.contact_name,
    "Company": intro.company ?? "",
    "Website": intro.website ?? "",
    "Industry": intro.industry ?? "",
    "Introduced By": intro.founder_name,
    "Date": intro.date,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dealroom Export");

  worksheet["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
  ];

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dealroom-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
