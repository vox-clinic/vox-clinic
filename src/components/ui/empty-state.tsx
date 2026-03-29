import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href: string
    icon?: LucideIcon
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="mx-auto mb-1 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
        <Icon className="size-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-vox-primary hover:text-vox-primary/80 rounded-lg px-3 py-1.5 hover:bg-vox-primary/5 transition-colors focus-visible:ring-2 focus-visible:ring-vox-primary/50 focus-visible:ring-offset-2 outline-none"
        >
          {action.icon && <action.icon className="size-3" />}
          {action.label}
        </Link>
      )}
    </div>
  )
}
