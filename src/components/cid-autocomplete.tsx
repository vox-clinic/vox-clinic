"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CidCode } from "@/types"

// ---------- Props ----------

interface CidAutocompleteMultiProps {
  mode: "multi"
  value: CidCode[]
  onChange: (value: CidCode[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface CidAutocompleteSingleProps {
  mode: "single"
  value: CidCode | null
  onChange: (value: CidCode | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export type CidAutocompleteProps =
  | CidAutocompleteMultiProps
  | CidAutocompleteSingleProps

// ---------- Component ----------

export function CidAutocomplete(props: CidAutocompleteProps) {
  const { mode, placeholder, disabled, className } = props

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CidCode[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ----- Derived state -----

  const selectedCodes: CidCode[] =
    mode === "multi" ? props.value : props.value ? [props.value] : []

  const isCodeSelected = useCallback(
    (code: string) => selectedCodes.some((c) => c.code === code),
    [selectedCodes],
  )

  // ----- Fetch -----

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/cid/search?q=${encodeURIComponent(q)}&limit=20`,
      )
      if (!res.ok) throw new Error("fetch failed")
      const data: CidCode[] = await res.json()
      setResults(data)
      setIsOpen(true)
      setActiveIndex(-1)
    } catch {
      setResults([])
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ----- Debounced search -----

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  // ----- Close on outside click -----

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ----- Scroll active item into view -----

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  // ----- Selection handlers -----

  function selectItem(item: CidCode) {
    if (mode === "multi") {
      if (!isCodeSelected(item.code)) {
        ;(props as CidAutocompleteMultiProps).onChange([
          ...(props as CidAutocompleteMultiProps).value,
          item,
        ])
      }
      setQuery("")
      setIsOpen(false)
      inputRef.current?.focus()
    } else {
      ;(props as CidAutocompleteSingleProps).onChange(item)
      setQuery(`${item.code} — ${item.description}`)
      setIsOpen(false)
    }
  }

  function removeItem(code: string) {
    if (mode === "multi") {
      ;(props as CidAutocompleteMultiProps).onChange(
        (props as CidAutocompleteMultiProps).value.filter(
          (c) => c.code !== code,
        ),
      )
    } else {
      ;(props as CidAutocompleteSingleProps).onChange(null)
      setQuery("")
      inputRef.current?.focus()
    }
  }

  function clearSingle() {
    if (mode === "single") {
      ;(props as CidAutocompleteSingleProps).onChange(null)
      setQuery("")
      inputRef.current?.focus()
    }
  }

  // ----- Keyboard navigation -----

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectItem(results[activeIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  // ----- Render -----

  const showClearButton = mode === "single" && props.value !== null

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            // If single mode and user starts typing again, clear selection
            if (mode === "single" && props.value) {
              ;(props as CidAutocompleteSingleProps).onChange(null)
            }
          }}
          onFocus={() => {
            if (query.length >= 2 && results.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ?? "Digite o código ou nome da doença (CID-10)"
          }
          disabled={disabled}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {showClearButton && !isLoading && (
          <button
            type="button"
            onClick={clearSingle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border/60 bg-popover p-1 shadow-lg"
        >
          {results.map((item, index) => {
            const selected = isCodeSelected(item.code)
            return (
              <li
                key={item.code}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  index === activeIndex && "bg-accent text-accent-foreground",
                  selected && "opacity-50",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur
                  if (!selected) selectItem(item)
                }}
              >
                <span className="shrink-0 font-mono text-xs font-semibold text-vox-primary">
                  {item.code}
                </span>
                <span className="text-muted-foreground">—</span>
                <span className="truncate">{item.description}</span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Empty state */}
      {isOpen && results.length === 0 && query.length >= 2 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/60 bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg">
          Nenhum resultado encontrado para &ldquo;{query}&rdquo;
        </div>
      )}

      {/* Multi mode: selected badges */}
      {mode === "multi" && selectedCodes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedCodes.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 rounded-lg bg-vox-primary/10 px-2 py-1 text-xs font-medium text-vox-primary"
            >
              <span className="font-mono font-semibold">{item.code}</span>
              <span className="max-w-[180px] truncate text-vox-primary/80">
                {item.description}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.code)}
                disabled={disabled}
                className="ml-0.5 rounded-full p-0.5 hover:bg-vox-primary/20 disabled:pointer-events-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
