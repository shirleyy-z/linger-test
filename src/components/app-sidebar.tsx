import Link from "next/link";
import { BookHeart, Home, Images, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";

const links = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/memories", label: "Memories", icon: Images },
  { href: "/dashboard/collections", label: "Collections", icon: BookHeart },
  { href: "/dashboard/wrapped", label: "Wrapped", icon: Sparkles }
];

export function AppSidebar() {
  return (
    <aside className="paper-soft hidden min-h-screen w-64 shrink-0 border-y-0 border-l-0 p-5 md:block">
      <Logo />
      <nav className="mt-10 space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            className="flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-[var(--muted)] transition hover:bg-[var(--fennel)] hover:text-[var(--ink)]"
            href={href}
            key={href}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
