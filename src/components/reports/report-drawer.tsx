"use client";

import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { SlideOver } from "@/components/reports/slide-over";
import { ReportView } from "@/components/reports/report-view";

/** Right slide-in panel for reading a report without leaving the workspace. */
export function ReportDrawer({
  reportId,
  onClose,
}: {
  reportId: string | null;
  onClose: () => void;
}) {
  return (
    <SlideOver
      open={!!reportId}
      onClose={onClose}
      headerRight={
        reportId ? (
          <Link
            href={`/reports/${reportId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Open full page
          </Link>
        ) : null
      }
    >
      {reportId && <ReportView reportId={reportId} />}
    </SlideOver>
  );
}
