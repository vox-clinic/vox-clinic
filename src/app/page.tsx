import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { LandingPage } from "@/components/landing/landing-page"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    })

    if (user?.onboardingComplete) {
      redirect("/dashboard")
    } else {
      redirect("/onboarding")
    }
  }

  return <LandingPage />
}
