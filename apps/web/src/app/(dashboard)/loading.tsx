import { Spinner } from "@skolara/ui";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
      <Spinner className="h-5 w-5" />
      <p className="text-sm">Loading...</p>
    </div>
  );
}
