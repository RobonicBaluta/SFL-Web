import { draftFromFiles, type EventDraft } from "@/lib/admin/draft";
import { GitHubError, readEvents, type RepoEvent } from "@/lib/admin/github";
import { eventVersion } from "@/lib/admin/save";
import { ADMIN_TAGS } from "@/lib/admin/tags";
import EventForm from "../../_components/EventForm";
import Problem from "../../_components/Problem";
import { requireLogin } from "../../_lib/gate";

export const dynamic = "force-dynamic";

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

  let event: RepoEvent | undefined;
  try {
    event = (await readEvents(setup.github)).find((e) => e.slug === slug);
  } catch (e) {
    if (!(e instanceof GitHubError)) throw e;
    return <Problem message={e.message} />;
  }
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

  return (
    <EventForm
      mode="edit"
      initial={draft}
      baseVersion={eventVersion(event.files, event.images)}
      tags={ADMIN_TAGS}
      takenSlugs={[]}
      savedSha={saved}
    />
  );
}
