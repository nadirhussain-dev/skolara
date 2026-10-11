import { useMyChildren } from "@skolara/api-client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Children = NonNullable<ReturnType<typeof useMyChildren>["data"]>;

interface ChildState {
  children: Children;
  /** The child every family tab is currently showing. Undefined while loading or when none is linked. */
  child: Children[number] | undefined;
  select: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const ChildContext = createContext<ChildState | null>(null);

/**
 * One selected child shared by every family tab, so switching child on Home
 * also switches Fees and Results. A student account has exactly one: itself.
 */
export function ChildProvider({ children }: { children: ReactNode }) {
  const query = useMyChildren();
  const [selectedId, setSelectedId] = useState<string>();
  const value = useMemo<ChildState>(() => {
    const list = query.data ?? [];
    return {
      children: list,
      child: list.find((c) => c.id === selectedId) ?? list[0],
      select: setSelectedId,
      isLoading: query.isLoading,
      isError: query.isError,
      refetch: () => void query.refetch(),
    };
  }, [query, selectedId]);
  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChild(): ChildState {
  const state = useContext(ChildContext);
  if (!state) throw new Error("useChild must be used inside ChildProvider");
  return state;
}
