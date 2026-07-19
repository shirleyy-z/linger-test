import Image from "next/image";
import { initials, type MemoryAuthor } from "@/lib/memories";

export function AuthorTag({ author, className = "" }: { author: MemoryAuthor; className?: string }) {
  return (
    <span className={`author-tag ${className}`} title={`Added by ${author.display_name}`}>
      <span className="author-tag-avatar" aria-hidden="true">
        {author.avatar_url ? (
          <Image alt="" height={20} src={author.avatar_url} width={20} />
        ) : (
          initials(author.display_name)
        )}
      </span>
      added by {author.display_name}
    </span>
  );
}
