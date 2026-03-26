import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import Link from "next/link"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user || user.role !== "superadmin") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-md">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <span className="text-[15px] font-bold tracking-tight text-slate-900">
                Vox<span className="text-slate-500">Clinic</span>
              </span>
            </Link>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              Admin
            </span>
            <nav className="ml-4 hidden items-center gap-1 md:flex">
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Visao Geral
              </Link>
              <Link
                href="/admin/workspaces"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Workspaces
              </Link>
              <Link
                href="/admin/usuarios"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Usuarios
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
              Voltar ao app
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <UserButton
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-xl",
                },
              }}
            />
          </div>
        </div>
      </header>
      <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
    </div>
  )
}
