export default function BannedPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-6">🚫</div>
        <h1 className="text-2xl font-semibold mb-3">Account Suspended</h1>
        <p className="text-neutral-400 text-sm leading-relaxed">
          Your account has been suspended. You cannot access SONCAR services at
          this time.
        </p>
        <p className="mt-4 text-neutral-500 text-sm">
          If you believe this is a mistake, please contact us at{" "}
          <a
            href="mailto:support@soncar.co.uk"
            className="text-amber-400 hover:underline"
          >
            support@soncar.co.uk
          </a>
          .
        </p>
      </div>
    </main>
  );
}
