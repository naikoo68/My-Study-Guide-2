import { Loader2, AlertTriangle, Inbox } from "lucide-react";

export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = "Nothing here yet." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
      <Inbox className="h-10 w-10" />
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}
