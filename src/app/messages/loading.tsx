export default function MessagesLoading() {
  return (
    <main className="messages-page" aria-busy="true">
      <div className="messages-shell">
        <div className="empty-conversations" role="status">Loading conversations…</div>
      </div>
    </main>
  );
}
