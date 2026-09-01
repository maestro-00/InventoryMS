import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers/app-providers";
import "./app/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root is required");
}

async function startMocks(): Promise<void> {
  if (import.meta.env.VITE_API_MOCKING !== "true") return;
  const [{ setupWorker }, { us1ScenarioHandlers }] = await Promise.all([
    import("msw/browser"),
    import("./shared/test/msw/us1-scenario"),
  ]);
  await setupWorker(...us1ScenarioHandlers).start({ onUnhandledRequest: "bypass" });
}

void startMocks().then(() => {
  createRoot(root).render(<AppProviders />);
  document.getElementById("boot-brand")?.remove();
});
