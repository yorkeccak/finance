import { NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { statusToDTO } from "@/lib/reports";
import { getDeepResearchStatus } from "@/lib/valyu-workflows";
import { buildPdfHtmlTemplate } from "@/lib/pdf-utils";
import { cleanFinancialText, preprocessMarkdownText } from "@/lib/markdown-utils";

export const maxDuration = 300;

const isProduction = process.env.NODE_ENV === "production";
let chromium: any = null;
if (isProduction) {
  try {
    chromium = require("@sparticuz/chromium");
  } catch {
    /* fall back to local puppeteer */
  }
}

const sanitize = (s: string) =>
  s.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 50);

/**
 * POST /api/reports/[reportId]/pdf - branded PDF of a completed report.
 * Reuses the shared pdf template/puppeteer pipeline, but reports are plain
 * markdown + tables (no charts/CSVs), so all the chart machinery is skipped.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  let browser: Browser | null = null;
  try {
    const { reportId } = await params;
    const body = await req.json().catch(() => ({}));
    const valyuAccessToken: string | undefined = body?.valyuAccessToken;
    if (!isSelfHostedMode() && !valyuAccessToken) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const status = await getDeepResearchStatus(reportId, { valyuAccessToken });
    const report = statusToDTO(reportId, status);
    if (report.status !== "completed" || !report.output) {
      return NextResponse.json({ error: "Report is not ready" }, { status: 400 });
    }

    const content = preprocessMarkdownText(cleanFinancialText(report.output));

    const logoPath = path.join(process.cwd(), "public", "valyu.svg");
    const logoSvg = fs.readFileSync(logoPath, "utf-8");
    const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

    const html = buildPdfHtmlTemplate({
      title: report.title || "Research Report",
      content,
      citations: [],
      logoDataUrl,
    });

    browser = isProduction && chromium
      ? await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        })
      : await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });

    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2cm", bottom: "3cm" },
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="font-size:9px;color:#6b7280;text-align:center;width:100%;padding-top:10px;border-top:1px solid #e5e7eb;">
          <span style="margin-right:20px;">Valyu</span>
          <span style="margin-right:20px;">CONFIDENTIAL</span>
          <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
    });
    await page.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitize(report.title || "report")}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error?.message },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close();
  }
}
