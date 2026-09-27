import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app/App";
// Font self-host (BC-28): Inter 400–700 & Plus Jakarta Sans 600–800 via variable fonts.
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "@/styles/globals.css";

async function enableMock() {
  // Mock aktif bila `VITE_API_MOCK=true` (dev:mock, test) — tidak masuk bundle produksi.
  if (import.meta.env.VITE_API_MOCK === "true") {
    const { startMockWorker } = await import("@/mocks/browser");
    await startMockWorker();
  }
}

void enableMock().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
