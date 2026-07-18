import { redirect } from "next/navigation";

export default function LettersPage() {
  redirect("/dashboard/memories?type=letter");
}
