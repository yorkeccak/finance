"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResearchImage, ResearchDeliverable } from "@/lib/valyu-workflows";

const FILETYPE_ICON: Record<string, string> = {
  xlsx: "/assets/filetypes/excel.svg",
  csv: "/assets/filetypes/csv.svg",
  pptx: "/assets/filetypes/powerpoint.svg",
  docx: "/assets/filetypes/word.svg",
  pdf: "/assets/filetypes/pdf.svg",
};

const TYPE_LABEL: Record<string, string> = {
  xlsx: "Excel",
  csv: "CSV",
  pptx: "PowerPoint",
  docx: "Word",
  pdf: "PDF",
};

const proxied = (url: string) => `/api/reports/asset-proxy?url=${encodeURIComponent(url)}`;
const officeEmbed = (url: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

/* -------------------------------------------------------------------------- */
/* Charts                                                                     */
/* -------------------------------------------------------------------------- */

/** Grid of charts generated during the research run. The image URLs are public
 *  token-bearing PNGs, so they render directly. */
export function ChartGallery({ images }: { images: ResearchImage[] }) {
  if (!images.length) return null;
  return (
    <section className="mt-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
        Charts
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {images.map((img, i) => (
          <figure
            key={img.imageId ?? `${img.imageUrl}-${i}`}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote
                token-bearing URL; next/image optimization not needed here. */}
            <img
              src={img.imageUrl}
              alt={img.title || `Chart ${i + 1}`}
              loading="lazy"
              className="w-full h-auto bg-white"
            />
            {img.title && (
              <figcaption className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                {img.title}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Deliverables                                                               */
/* -------------------------------------------------------------------------- */

/** List of generated downloadable artifacts (spreadsheets, docs, decks, pdfs).
 *  Each opens an in-app viewer; failed ones are shown but not openable. */
export function DeliverablesList({ deliverables }: { deliverables: ResearchDeliverable[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const usable = deliverables.filter((d) => d.url);
  if (!usable.length) return null;

  return (
    <section className="mb-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
        Deliverables
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {usable.map((d, i) => {
          const failed = d.status === "failed";
          const icon = FILETYPE_ICON[d.type] ?? "/assets/filetypes/pdf.svg";
          const meta = [
            TYPE_LABEL[d.type] ?? d.type.toUpperCase(),
            d.rowCount != null && d.columnCount != null
              ? `${d.rowCount}×${d.columnCount}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={d.id ?? `${d.url}-${i}`}
              onClick={() => !failed && setOpenIndex(i)}
              disabled={failed}
              className="flex items-center gap-3 text-left p-3 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-muted/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Image src={icon} alt="" width={28} height={28} unoptimized className="h-7 w-7 object-contain flex-shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground truncate">
                  {d.title || d.description || `${TYPE_LABEL[d.type] ?? d.type} file`}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {failed ? "Generation failed" : meta}
                </span>
              </span>
              {!failed && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {openIndex != null && usable[openIndex] && (
        <DeliverableViewer
          deliverable={usable[openIndex]}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Viewer dialog                                                              */
/* -------------------------------------------------------------------------- */

function DeliverableViewer({
  deliverable,
  onClose,
}: {
  deliverable: ResearchDeliverable;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="overflow-hidden flex flex-col p-0 gap-0"
        style={{ width: "95vw", maxWidth: "1200px", height: "88vh", maxHeight: "88vh" }}
      >
        <DialogHeader className="px-5 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-medium truncate flex items-center gap-2">
            <Image
              src={FILETYPE_ICON[deliverable.type] ?? "/assets/filetypes/pdf.svg"}
              alt=""
              width={18}
              height={18}
              unoptimized
              className="h-[18px] w-[18px] object-contain"
            />
            {deliverable.title || `${TYPE_LABEL[deliverable.type] ?? deliverable.type} file`}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href={deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-foreground/20"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted/20">
          <DeliverableContent deliverable={deliverable} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeliverableContent({ deliverable }: { deliverable: ResearchDeliverable }) {
  const { type, url } = deliverable;

  // PDFs render natively in an iframe, streamed same-origin (upstream sends
  // X-Frame-Options: DENY, so the proxy is required).
  if (type === "pdf") {
    return <iframe src={proxied(url)} className="w-full h-full border-0" title="PDF preview" />;
  }

  // Office formats render via the Microsoft Office Online viewer, which fetches
  // the public asset URL server-side (no local Office/SheetJS dependency).
  if (type === "docx" || type === "pptx" || type === "xlsx") {
    return (
      <iframe
        src={officeEmbed(url)}
        className="w-full h-full border-0"
        title={`${type} preview`}
      />
    );
  }

  if (type === "csv") {
    return <CsvTable url={url} />;
  }

  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      Preview not available - use Download to open this file.
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CSV table                                                                  */
/* -------------------------------------------------------------------------- */

/** Minimal CSV parser: handles quoted fields, escaped quotes ("") and commas
 *  / newlines inside quotes. Sufficient for generated spreadsheet exports. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function CsvTable({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setText(null);
    setError(null);
    fetch(proxied(url))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Failed to load (${r.status})`))))
      .then((t) => alive && setText(t))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [url]);

  const rows = useMemo(() => (text ? parseCsv(text) : []), [text]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {error}
      </div>
    );
  }
  if (text == null) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Empty file</div>;
  }

  const [header, ...body] = rows;
  const shown = body.slice(0, 200);
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-muted sticky top-0 z-10">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-semibold border-b border-border whitespace-nowrap">
                {h || `Column ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, ri) => (
            <tr key={ri} className="border-b border-border hover:bg-muted/50">
              {header.map((_, ci) => (
                <td key={ci} className="px-4 py-2 whitespace-nowrap">{r[ci] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length > shown.length && (
        <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 border-t border-border">
          Showing first {shown.length} of {body.length} rows
        </div>
      )}
    </div>
  );
}
