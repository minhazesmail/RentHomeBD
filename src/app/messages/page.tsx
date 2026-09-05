import { MessagesInboxPane } from "@/components/messages-inbox-pane";
import { ProductNavigation } from "@/components/product-navigation";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type InboxSearchParams = {
  page?: string | string[];
  q?: string | string[];
  filter?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstValue(value) || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<InboxSearchParams> }) {
  const auth = await requireUser();
  const canList = auth.profile.primary_role === "owner" || auth.profile.primary_role === "agent";
  const resolvedSearchParams = await searchParams;
  const page = pageNumber(resolvedSearchParams.page);
  const query = (firstValue(resolvedSearchParams.q) || "").trim().slice(0, 120);
  const unreadOnly = firstValue(resolvedSearchParams.filter) === "unread";

  return (
    <main className="messages-page messages-inbox-route">
      <ProductNavigation authenticated canList={canList} current="messages" />
      <div className="messages-workspace-shell">
        <MessagesInboxPane userId={auth.userId} page={page} query={query} unreadOnly={unreadOnly} />
        <section className="messages-workspace-empty" aria-label="Conversation workspace">
          <div className="messages-workspace-empty-mark" aria-hidden="true"><span /><span /><span /></div>
          <p className="eyebrow">Rental conversations</p>
          <h2>Select a conversation to keep the property and the discussion side by side.</h2>
          <p>Messages stay tied to the home you are discussing, so rent, listing context, and the conversation remain easy to reference without jumping between pages.</p>
        </section>
      </div>
    </main>
  );
}
