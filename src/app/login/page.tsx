import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex">
            <Logo />
          </div>
          <h1 className="serif mt-7 text-4xl">Your memories are waiting.</h1>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            Sign in to begin your private scrapbook.
          </p>
        </div>

        <AuthError searchParams={searchParams} />
        <AuthForm />

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link className="underline" href="/">
            Return to the home page
          </Link>
        </p>
      </div>
    </main>
  );
}

async function AuthError({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  if (!params.error) return null;

  return (
    <p
      className="mb-4 rounded-xl border p-3 text-sm"
      style={{ background: "var(--cherry)", borderColor: "var(--peony)" }}
    >
      {params.error}
    </p>
  );
}
