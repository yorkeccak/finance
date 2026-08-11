"use client";

import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { SlideOver } from "@/components/reports/slide-over";
import { ExampleReportView } from "@/components/reports/example-report-view";

/** Right slide-in panel for a seeded example report. */
export function ExampleReportDrawer({
  domainId,
  onClose,
  onRun,
}: {
  domainId: string | null;
  onClose: () => void;
  onRun?: (workflowSlug: string) => void;
}) {
  return (
    <SlideOver
      open={!!domainId}
      onClose={onClose}
      headerRight={
        domainId ? (
          <Link
            href={`/reports/examples/${domainId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Open full page
          </Link>
        ) : null
      }
    >
      {domainId && <ExampleReportView domainId={domainId} onRun={onRun} />}
    </SlideOver>
  );
}
