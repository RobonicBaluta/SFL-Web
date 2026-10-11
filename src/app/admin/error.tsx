"use client";

import Link from "next/link";

/** Anything unexpected on an admin page: say so plainly instead of Next's generic page. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="border-2 border-red-700 bg-white p-6" role="alert">
      <h1 className="font-display text-2xl font-bold uppercase">Something went wrong</h1>
      <p className="mt-3 text-sm">
        Nothing was saved by this error. Try again; if it keeps happening, send this code to a developer:{" "}
        <code>{error.digest ?? error.message}</code>
      </p>
      <div className="mt-4 flex gap-4">
        <button type="button" onClick={reset} className="bg-sfl-gold px-4 py-2 font-display font-bold uppercase">
          Try again
        </button>
        <Link href="/admin" className="self-center font-semibold underline">
          Back to events
        </Link>
      </div>
    </div>
  );
}
