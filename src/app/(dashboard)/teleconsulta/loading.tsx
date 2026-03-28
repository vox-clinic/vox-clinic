import { Loader2 } from "lucide-react"

export default function TeleconsultaLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="size-8 animate-spin text-vox-primary" />
    </div>
  )
}
