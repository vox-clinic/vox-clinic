import { redirect } from "next/navigation"

// Legacy route - consultation review now happens at /appointments/review
// before the appointment is created (confirmation-before-save pattern)
export default function LegacyReviewPage() {
  redirect("/dashboard")
}
