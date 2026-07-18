export function AppTopbar({ displayName }: { displayName: string }) {
  return (
    <header className="flex items-center justify-between border-b px-5 py-4 md:px-8" style={{ borderColor: "var(--line)" }}>
      <div>
        <p className="text-sm text-[var(--muted)]">Signed in as</p>
        <p className="font-bold">{displayName}</p>
      </div>
      <form action="/auth/signout" method="post">
        <button className="secondary-button" type="submit">Sign out</button>
      </form>
    </header>
  );
}
