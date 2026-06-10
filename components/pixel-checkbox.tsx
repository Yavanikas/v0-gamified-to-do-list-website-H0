"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function PixelCheckbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean
  onChange?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center border border-panel-border bg-input/40 transition-colors hover:border-cyan",
        checked && "bg-cyan/20 border-cyan",
        className,
      )}
    >
      {checked && <Check className="h-4 w-4 text-cyan" strokeWidth={3} />}
    </button>
  )
}
