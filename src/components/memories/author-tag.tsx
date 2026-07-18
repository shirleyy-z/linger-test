import { initials, type MemoryAuthor } from "@/lib/memories";

export function AuthorTag({ author, className = "" }: { author: MemoryAuthor; className?: string }) {
  return (
    <span className={`author-tag ${className}`} title={`Added by ${author.display_name}`}>
      <span className="author-tag-avatar" aria-hidden="true">
        {author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={author.avatar_url} />
        ) : (
          initials(author.display_name)
        )}
      </span>
      added by {author.display_name}
    </span>
  );
}
