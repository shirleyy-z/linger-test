import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
      <Logo />
      <nav className="flex items-center gap-3">
        <Link className="secondary-button hide-mobile" href="#features">
          How it works
        </Link>
        <Link className="primary-button" href="/login">
          Enter Linger
        </Link>
      </nav>
    </header>
  );
}
