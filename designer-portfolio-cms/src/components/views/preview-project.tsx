"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/api";
import { CaseStudyView } from "@/components/views/case-study";
import {
  PreviewToolbar,
  AdminAccessPanel,
  PreviewLoading,
  PreviewFrame,
  isAuthError,
  type PreviewDevice,
} from "@/components/views/preview-home";

/** Admin-only draft preview of a single project case study (#/preview/project/<slug>). */
export function PreviewProjectView({ slug }: { slug: string }) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const { data, isLoading, error } = useQuery({
    queryKey: ["preview-project", slug],
    queryFn: () => adminApi.previewProject(slug),
    retry: false,
  });

  return (
    <div className="flex min-h-[100svh] flex-col bg-surface">
      <PreviewToolbar title={`Project draft — ${slug}`} device={device} onDevice={setDevice} />
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-8">
        {isAuthError(error) ? (
          <AdminAccessPanel />
        ) : isLoading ? (
          <PreviewLoading label="Loading project draft…" />
        ) : data ? (
          <PreviewFrame device={device}>
            <CaseStudyView prefetched={data} />
          </PreviewFrame>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <p className="font-heading text-xl font-semibold">Project draft not found</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              No project with the slug “{slug}” exists — it may have been renamed or deleted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
