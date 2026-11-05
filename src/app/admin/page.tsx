import { redirect } from "next/navigation";

export default function PreviousLibraryPage() {
  redirect("/?view=add");
}
