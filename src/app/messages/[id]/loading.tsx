export default function MessageThreadLoading() {
  return (
    <main className="messages-page" aria-busy="true">
      <div className="thread-shell">
        <div className="renter-empty" role="status">Loading conversation…</div>
      </div>
    </main>
  );
}
