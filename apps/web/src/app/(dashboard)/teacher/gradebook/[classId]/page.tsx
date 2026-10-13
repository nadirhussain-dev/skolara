import { redirect } from "next/navigation";

/** Marks are entered on the shared Exams and results page now. */
export default function GradebookRedirect() {
  redirect("/school/exams");
}
