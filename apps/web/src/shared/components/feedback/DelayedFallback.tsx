import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigation } from "react-router-dom";

const PENDING_DELAY_MS = 300;

/**
 * Skeleton muncul hanya bila navigasi > 300 ms dan bertahan ≥ 300 ms
 * (paritas `pendingMs/pendingMinMs 300` legacy).
 */
export function DelayedFallback({ children }: { children: ReactNode }) {
  const navigation = useNavigation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") return;
    const showTimer = window.setTimeout(() => setShow(true), PENDING_DELAY_MS);
    return () => window.clearTimeout(showTimer);
  }, [navigation.state]);

  // Reset saat navigasi selesai (adjust during render).
  if (navigation.state === "idle" && show) {
    setShow(false);
  }

  if (navigation.state === "idle" || !show) return null;
  return <>{children}</>;
}
