"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ExampleReportView } from "@/components/reports/example-report-view";

export default function ExampleReportPage({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const { domainId } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-gray-950 flex overflow-x-hidden">
      <Sidebar
        currentSessionId={undefined}
        onSessionSelect={(id: string) => router.push(`/?chatId=${id}`)}
        onNewChat={() => router.push("/")}
        hasMessages={false}
      />

      <div className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        <div className="max-w-3xl w-full mx-auto px-4 md:px-8 py-8">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to reports
          </Link>

          <ExampleReportView domainId={domainId} />
        </div>
      </div>
    </div>
  );
}
