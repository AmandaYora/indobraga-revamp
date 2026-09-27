import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ApiError } from "@/shared/services/api-error";

export interface ApiQueryState<T> {
  data: T | null;
  error: ApiError | Error | null;
  loading: boolean;
  reload: () => void;
  setData: Dispatch<SetStateAction<T | null>>;
}

export interface ApiQueryOptions<T> {
  enabled?: boolean;
  initialData?: T | null;
  refetchOnMount?: boolean;
}

/**
 * Hook fetch data (paritas `hooks/use-api-query.ts` legacy +
 * `AbortController` & guard urutan respons per PLAN-02 §2.3).
 * Tanpa cache global; data sesi & settings di store.
 *
 * Reset saat key berubah memakai pola "adjust state during render".
 * `initialData` harus stabil antar render (konstanta modul atau useMemo).
 */
export function useApiQuery<T>(
  key: readonly unknown[],
  loader: (signal: AbortSignal) => Promise<T>,
  options: ApiQueryOptions<T> = {},
): ApiQueryState<T> {
  const { enabled = true, initialData = null, refetchOnMount = true } = options;
  const stableKey = JSON.stringify(key);
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState(() => enabled && initialData === null);
  const [revision, setRevision] = useState(0);
  const [prev, setPrev] = useState({ enabled, stableKey, initialData });
  const requestSeq = useRef(0);
  const load = useEffectEvent(loader);

  if (
    prev.enabled !== enabled ||
    prev.stableKey !== stableKey ||
    prev.initialData !== initialData
  ) {
    setPrev({ enabled, stableKey, initialData });
    setData(initialData);
    setError(null);
    setLoading(enabled && initialData === null);
  }

  useEffect(() => {
    if (!enabled) return;
    if (!refetchOnMount && revision === 0 && initialData !== null) return;
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    let cancelled = false;
    load(controller.signal)
      .then((result) => {
        if (cancelled || requestSeq.current !== seq) return;
        setData(result);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (cancelled || requestSeq.current !== seq) return;
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        if (fetchError instanceof ApiError || fetchError instanceof Error) {
          setError(fetchError);
        } else {
          setError(new Error("Terjadi kendala saat memuat data."));
        }
      })
      .finally(() => {
        if (!cancelled && requestSeq.current === seq) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, refetchOnMount, revision, stableKey, initialData]);

  const reload = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);

  return { data, error, loading, reload, setData };
}
