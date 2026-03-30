"use client"

import { cn } from "@/lib/utils"

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]

const UPPER = [...UPPER_RIGHT, ...UPPER_LEFT]
const LOWER = [...LOWER_LEFT, ...LOWER_RIGHT]

const TOOTH_FACES = ["V", "O", "D", "M", "L"] as const
export type ToothFace = (typeof TOOTH_FACES)[number]

const FACE_LABELS: Record<ToothFace, string> = {
  V: "Vestibular",
  O: "Oclusal",
  D: "Distal",
  M: "Mesial",
  L: "Lingual",
}

function isMolar(tooth: number): boolean {
  const unit = tooth % 10
  return unit >= 6 && unit <= 8
}

function isPremolar(tooth: number): boolean {
  const unit = tooth % 10
  return unit >= 4 && unit <= 5
}

function isCanine(tooth: number): boolean {
  return tooth % 10 === 3
}

function toothWidth(tooth: number): string {
  if (isMolar(tooth)) return "w-9"
  if (isPremolar(tooth)) return "w-7"
  if (isCanine(tooth)) return "w-6"
  return "w-5"
}

function toothHeight(tooth: number): string {
  if (isMolar(tooth)) return "h-10"
  if (isPremolar(tooth)) return "h-9"
  if (isCanine(tooth)) return "h-10"
  return "h-8"
}

interface ToothFaceSelection {
  [tooth: string]: ToothFace[]
}

function ToothFaceDiagram({
  tooth,
  selectedFaces,
  onToggleFace,
}: {
  tooth: number
  selectedFaces: ToothFace[]
  onToggleFace: (tooth: number, face: ToothFace) => void
}) {
  return (
    <div className="relative size-7 mx-auto mt-0.5">
      {/* Top - Vestibular */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFace(tooth, "V") }}
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-t-sm border border-border/60 transition-colors",
          selectedFaces.includes("V") ? "bg-vox-primary border-vox-primary" : "bg-background hover:bg-muted/60"
        )}
        title="Vestibular"
      />
      {/* Bottom - Lingual */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFace(tooth, "L") }}
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-b-sm border border-border/60 transition-colors",
          selectedFaces.includes("L") ? "bg-vox-primary border-vox-primary" : "bg-background hover:bg-muted/60"
        )}
        title="Lingual"
      />
      {/* Left - Mesial */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFace(tooth, "M") }}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-l-sm border border-border/60 transition-colors",
          selectedFaces.includes("M") ? "bg-vox-primary border-vox-primary" : "bg-background hover:bg-muted/60"
        )}
        title="Mesial"
      />
      {/* Right - Distal */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFace(tooth, "D") }}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-r-sm border border-border/60 transition-colors",
          selectedFaces.includes("D") ? "bg-vox-primary border-vox-primary" : "bg-background hover:bg-muted/60"
        )}
        title="Distal"
      />
      {/* Center - Oclusal */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFace(tooth, "O") }}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-[2px] border border-border/60 transition-colors",
          selectedFaces.includes("O") ? "bg-vox-primary border-vox-primary" : "bg-background hover:bg-muted/60"
        )}
        title="Oclusal"
      />
    </div>
  )
}

function ToothButton({
  tooth,
  isSelected,
  onClick,
  showFaces,
  selectedFaces,
  onToggleFace,
  isUpper,
}: {
  tooth: number
  isSelected: boolean
  onClick: (tooth: number) => void
  showFaces?: boolean
  selectedFaces?: ToothFace[]
  onToggleFace?: (tooth: number, face: ToothFace) => void
  isUpper: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {isUpper && (
        <span className={cn(
          "text-[9px] font-mono tabular-nums leading-none",
          isSelected ? "text-vox-primary font-bold" : "text-muted-foreground/60"
        )}>
          {tooth}
        </span>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(tooth)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(tooth) } }}
        className={cn(
          "rounded-md border-2 transition-all flex items-center justify-center cursor-pointer",
          toothWidth(tooth),
          toothHeight(tooth),
          isSelected
            ? "border-vox-primary bg-vox-primary/15 shadow-sm shadow-vox-primary/20"
            : "border-border/40 bg-card hover:border-vox-primary/40 hover:bg-muted/30"
        )}
      >
        {showFaces && isSelected && onToggleFace ? (
          <ToothFaceDiagram
            tooth={tooth}
            selectedFaces={selectedFaces ?? []}
            onToggleFace={onToggleFace}
          />
        ) : (
          <div className={cn(
            "rounded-sm",
            isMolar(tooth) ? "w-4 h-5" : isPremolar(tooth) ? "w-3 h-4" : "w-2.5 h-4",
            isSelected ? "bg-vox-primary/30" : "bg-muted/40"
          )} />
        )}
      </div>
      {!isUpper && (
        <span className={cn(
          "text-[9px] font-mono tabular-nums leading-none",
          isSelected ? "text-vox-primary font-bold" : "text-muted-foreground/60"
        )}>
          {tooth}
        </span>
      )}
    </div>
  )
}

export function Odontogram({
  selectedTeeth,
  onToggleTooth,
  showFaces = false,
  faceSelections,
  onToggleFace,
}: {
  selectedTeeth: number[]
  onToggleTooth: (tooth: number) => void
  showFaces?: boolean
  faceSelections?: ToothFaceSelection
  onToggleFace?: (tooth: number, face: ToothFace) => void
}) {
  return (
    <div className="space-y-1">
      {/* Upper arch */}
      <div className="flex items-end justify-center gap-px">
        <div className="flex items-end gap-px">
          {UPPER_RIGHT.map((t) => (
            <ToothButton
              key={t}
              tooth={t}
              isSelected={selectedTeeth.includes(t)}
              onClick={onToggleTooth}
              showFaces={showFaces}
              selectedFaces={faceSelections?.[String(t)]}
              onToggleFace={onToggleFace}
              isUpper
            />
          ))}
        </div>
        <div className="w-px h-12 bg-border/40 mx-1 self-center" />
        <div className="flex items-end gap-px">
          {UPPER_LEFT.map((t) => (
            <ToothButton
              key={t}
              tooth={t}
              isSelected={selectedTeeth.includes(t)}
              onClick={onToggleTooth}
              showFaces={showFaces}
              selectedFaces={faceSelections?.[String(t)]}
              onToggleFace={onToggleFace}
              isUpper
            />
          ))}
        </div>
      </div>

      {/* Midline */}
      <div className="h-px bg-border/30 mx-4" />

      {/* Lower arch */}
      <div className="flex items-start justify-center gap-px">
        <div className="flex items-start gap-px">
          {LOWER_RIGHT.map((t) => (
            <ToothButton
              key={t}
              tooth={t}
              isSelected={selectedTeeth.includes(t)}
              onClick={onToggleTooth}
              showFaces={showFaces}
              selectedFaces={faceSelections?.[String(t)]}
              onToggleFace={onToggleFace}
              isUpper={false}
            />
          ))}
        </div>
        <div className="w-px h-12 bg-border/40 mx-1 self-center" />
        <div className="flex items-start gap-px">
          {LOWER_LEFT.map((t) => (
            <ToothButton
              key={t}
              tooth={t}
              isSelected={selectedTeeth.includes(t)}
              onClick={onToggleTooth}
              showFaces={showFaces}
              selectedFaces={faceSelections?.[String(t)]}
              onToggleFace={onToggleFace}
              isUpper={false}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {showFaces && (
        <div className="flex items-center justify-center gap-3 pt-2 text-[9px] text-muted-foreground">
          {TOOTH_FACES.map((f) => (
            <span key={f}><span className="font-bold">{f}</span> {FACE_LABELS[f]}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export { UPPER, LOWER, TOOTH_FACES, FACE_LABELS }
