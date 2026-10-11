import Link from "next/link";
import { draftFromFiles, type EventDraft } from "@/lib/admin/draft";
import { readEvents } from "@/lib/admin/github";
import { ADMIN_TAGS } from "@/lib/admin/tags";
import EventForm from "../../_components/EventForm";
import { requireLogin } from "../../_lib/gate";

export const dynamic = "force-dynamic";

function Problem({ message }: { message: string }) {
  return (
    <div className="border-2 border-red-700 bg-white p-6" role="alert">
      <p>{message}</p>
      <Link href="/admin" className="mt-3 inline-block font-semibold underline">
        Back to events
      </Link>
    </div>
  );
}

export default async function EditEventPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const setup = await requireLogin();
  const { slug } = await params;
  const { saved } = await searchParams;

  const event = (await readEvents(setup.github)).find((e) => e.slug === slug);
  if (!event) return <Problem message="This event doesn't exist (it may have been deleted)." />;
  const { eventJson, roMdx, enMdx } = event.files;
  if (!eventJson || !roMdx || !enMdx) {
    return <Problem message="This event is missing event.json, ro.mdx or en.mdx. A developer needs to fix it." />;
  }

  let draft: EventDraft;
  try {
    draft = draftFromFiles({ eventJson, roMdx, enMdx }, event.images);
  } catch (e) {
    return <Problem message={`This event's files can't be read (${(e as Error).message}). A developer needs to fix it.`} />;
  }

  return <EventForm mode="edit" initial={draft} tags={ADMIN_TAGS} takenSlugs={[]} savedSha={saved} />;
}
