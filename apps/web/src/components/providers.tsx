"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientProvider } from "@skolara/api-client";
import { useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );
}
