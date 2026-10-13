import { useMyChildren } from "@skolara/api-client";
import { useSession } from "./session";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

type Children = NonNullable<ReturnType<typeof useMyChildren>["data"]>;

interface ChildState {
  children: Children;
  /** The child every family screen is currently showing. Undefined while loading or when none is linked. */
  child: Children[number] | undefined;
  select: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// The selection lives outside React so that a screen pushed on top of the
// tabs (homework, messages, absences…) opens on the same child the parent
// was just looking at, rather than snapping back to the first one.
let selectedId: string | undefined;
const listeners = new Set<() => void>();
const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => selectedId,
  set(id: string) {
    selectedId = id;
    for (const listener of listeners) listener();
  },
};

const ChildContext = createContext<ChildState | null>(null);

/**
 * One selected child shared by every family screen, so switching child on
 * Home also switches Fees, Results and everything opened from More. A
 * student account has exactly one: itself.
 */
export function ChildProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  // Only families have children to choose between; staff screens that share
  // a component with them shouldn't ask.
  const query = useMyChildren({ enabled: session.role === "PARENT" || session.role === "STUDENT" });
  const current = useSyncExternalStore(store.subscribe, store.get, store.get);
  const value = useMemo<ChildState>(() => {
    const list = query.data ?? [];
    return {
      children: list,
      child: list.find((c) => c.id === current) ?? list[0],
      select: store.set,
      isLoading: query.isLoading || !session.isLoaded,
      isError: query.isError,
      refetch: () => void query.refetch(),
    };
  }, [query, current, session.isLoaded]);
  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChild(): ChildState {
  const state = useContext(ChildContext);
  if (!state) throw new Error("useChild must be used inside ChildProvider");
  return state;
}
