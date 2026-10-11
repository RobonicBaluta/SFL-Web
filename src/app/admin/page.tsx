import matter from "gray-matter";
import Link from "next/link";
import { adminSetup, isLoggedIn } from "@/lib/admin/auth";
import { GitHubError, readEvents, type RepoEvent } from "@/lib/admin/github";
import { formatEventDate } from "@/lib/dates";
import { todayInBucharest } from "@/lib/events";
import DeployStatus from "./_components/DeployStatus";
import LoginForm from "./_components/LoginForm";

export const dynamic = "force-dynamic";

type Row = { slug: string; title: string; date: string; endDate?: string; photos: number; broken?: string };

function toRow(event: RepoEvent): Row {
  try {
    const meta = JSON.parse(event.files.eventJson ?? "") as { date: string; endDate?: string };
    const title = String(matter(event.files.roMdx ?? "").data.title ?? event.slug);
    return { slug: event.slug, title, date: meta.date, endDate: meta.endDate, photos: event.images.length };
  } catch (e) {
    return { slug: event.slug, title: event.slug, date: "", photos: event.images.length, broken: (e as Error).message };
  }
}

function EventList({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-sfl-gray">None.</p>
      ) : (
        <ul className="mt-3 divide-y-2 divide-neutral-200 border-2 border-sfl-black bg-white">
          {rows.map((row) => (
            <li key={row.slug} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{row.title}</p>
                <p className="text-sm text-sfl-gray">
                  {row.date ? formatEventDate("en", row.date, row.endDate) : "No valid date"} ·{" "}
                  {row.photos} {row.photos === 1 ? "photo" : "photos"}
                  {row.broken && <span className="text-red-700"> · file problem: {row.broken}</span>}
                </p>
              </div>
              <div className="flex gap-4 text-sm font-semibold">
                <a href={`/evenimente/${row.slug}`} target="_blank" rel="noreferrer" className="underline">
                  View
                </a>
                <Link href={`/admin/edit/${row.slug}`} className="underline">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminHome({
  searchParams
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const setup = adminSetup();
  if (setup.problems.length > 0) {
    return (
      <div className="border-2 border-red-700 bg-white p-6">
        <h1 className="font-display text-2xl font-bold uppercase">Admin is not set up yet</h1>
        <ul className="mt-3 list-disc pl-6">
          {setup.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Add the missing values in Vercel → Project → Settings → Environment Variables, then redeploy.
          The steps are in the README, under &quot;Pagina de admin&quot;.
        </p>
      </div>
    );
  }
  if (!(await isLoggedIn())) return <LoginForm />;

  let events: RepoEvent[];
  try {
    events = await readEvents(setup.github);
  } catch (e) {
    if (!(e instanceof GitHubError)) throw e;
    return (
      <div className="border-2 border-red-700 bg-white p-6" role="alert">
        <h1 className="font-display text-2xl font-bold uppercase">Can&apos;t read the events</h1>
        <p className="mt-3">{e.message}</p>
      </div>
    );
  }

  const { deleted } = await searchParams;
  const today = todayInBucharest(new Date());
  const rows = events.map(toRow);
  const lastDay = (r: Row) => r.endDate ?? r.date;
  const upcoming = rows.filter((r) => lastDay(r) >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = rows.filter((r) => lastDay(r) < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {deleted && <DeployStatus sha={deleted} />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold uppercase">Events</h1>
        <Link href="/admin/new" className="bg-sfl-gold px-4 py-2 font-display font-bold uppercase">
          + New event
        </Link>
      </div>
      <EventList title="Upcoming" rows={upcoming} />
      <EventList title="Past" rows={past} />
    </div>
  );
}
