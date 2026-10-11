import { emptyDraft } from "@/lib/admin/draft";
import { readEvents } from "@/lib/admin/github";
import { ADMIN_TAGS } from "@/lib/admin/tags";
import EventForm from "../_components/EventForm";
import { requireLogin } from "../_lib/gate";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const setup = await requireLogin();
  const taken = (await readEvents(setup.github)).map((e) => e.slug);
  return <EventForm mode="create" initial={emptyDraft()} tags={ADMIN_TAGS} takenSlugs={taken} />;
}
