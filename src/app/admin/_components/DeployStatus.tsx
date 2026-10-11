"use client";

import { useEffect, useState } from "react";

type State = "waiting" | "publishing" | "live" | "failed" | "unknown";

const POLL_MS = 5000;
const GIVE_UP_MS = 15 * 60 * 1000;

/** Follows Vercel's deployment of commit `sha` until it is live or failed. */
export default function DeployStatus({ sha, viewHref }: { sha: string; viewHref?: string }) {
  const [state, setState] = useState<State>("waiting");
  const [logUrl, setLogUrl] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const started = Date.now();
    async function poll() {
      try {
        const res = await fetch(`/api/admin/deploy?sha=${sha}`);
        if (res.ok) {
          const body = (await res.json()) as { state: State; url: string | null };
          if (stopped) return;
          setState(body.state);
          setLogUrl(body.url);
          if (body.state === "live" || body.state === "failed") return;
        }
      } catch {
        // Network blip: try again on the next tick.
      }
      if (stopped) return;
      if (Date.now() - started > GIVE_UP_MS) setState("unknown");
      else timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sha]);

  const box = "mb-6 border-2 p-4 text-sm";
  if (state === "live") {
    return (
      <div className={`${box} border-green-700 bg-green-50`} role="status">
        <strong>Live ✓</strong> The change is on the site.{" "}
        {viewHref && (
          <a href={viewHref} target="_blank" rel="noreferrer" className="font-semibold underline">
            View it
          </a>
        )}
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div className={`${box} border-red-700 bg-red-50`} role="alert">
        <strong>Publishing failed.</strong> The site still shows the previous version.{" "}
        {logUrl && (
          <a href={logUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
            Open the build log
          </a>
        )}
      </div>
    );
  }
  return (
    <div className={`${box} border-sfl-gold bg-yellow-50`} role="status">
      <strong>Saved.</strong>{" "}
      {state === "waiting" && "Waiting for Vercel to start publishing…"}
      {state === "publishing" && "Publishing… this usually takes 1–2 minutes."}
      {state === "unknown" && "Vercel hasn't reported back. Check the Vercel dashboard."}
    </div>
  );
}
