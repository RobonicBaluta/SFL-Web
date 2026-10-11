import { emptyDraft } from "@/lib/admin/draft";
import { GitHubError, readEvents } from "@/lib/admin/github";
import { ADMIN_TAGS } from "@/lib/admin/tags";
import EventForm from "../_components/EventForm";
import Problem from "../_components/Problem";
import { requireLogin } from "../_lib/gate";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const setup = await requireLogin();
  let taken: string[];
  try {
    taken = (await readEvents(setup.github)).map((e) => e.slug);
  } catch (e) {
    if (!(e instanceof GitHubError)) throw e;
    return <Problem message={e.message} />;
  }
  return <EventForm mode="create" initial={emptyDraft()} tags={ADMIN_TAGS} takenSlugs={taken} />;
}
