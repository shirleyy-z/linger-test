import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="Linger home" className="inline-flex items-center gap-3">
      <span
        className="grid h-10 w-10 place-items-center rounded-full border text-xl"
        style={{ background: "var(--fennel)", borderColor: "var(--pistachio)" }}
      >
        ✿
      </span>
      <span className="serif text-3xl font-semibold tracking-tight">linger</span>
    </Link>
  );
}
