import { useEffect, useState } from "react";

export type BootStatus =
  | "connecting"
  | "loading_index"
  | "warming_ai"
  | "ready"
  | "error";

export function useBackendReady() {
  const [status, setStatus] = useState<BootStatus>("connecting");

  useEffect(() => {
    async function boot() {
      try {
        // STEP 1 — wait backend health
        while (true) {
          try {
            const res = await fetch("http://127.0.0.1:8000/health");
            if (res.ok) break;
          } catch {}

          await new Promise((r) => setTimeout(r, 1200));
        }

        setStatus("loading_index");

        // small delay just for UI smoothness
        await new Promise((r) => setTimeout(r, 800));

        setStatus("warming_ai");

        // warmup endpoint (safe if not exists)
        fetch("http://127.0.0.1:8000/warmup-ai").catch(() => {});

        await new Promise((r) => setTimeout(r, 800));

        setStatus("ready");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }

    boot();
  }, []);

  return status;
}