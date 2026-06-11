"use client"

import { cn } from "@/lib/utils"

export type Tab = "dashboard" | "tasks" | "pomodoro" | "profile" | "shop"

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "DASHBOARD" },
  { id: "tasks", label: "TASKS" },
  { id: "pomodoro", label: "POMODORO" },
  { id: "profile", label: "PROFILE" },
  { id: "shop", label: "SHOP" },
]

export function TopNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="flex items-center justify-center gap-3 pt-4 sm:gap-8 sm:pt-6">
      {TABS.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-2 py-2 font-sans text-sm tracking-wider transition-colors sm:text-base",
              isActive
                ? "text-cyan"
                : "text-foreground/70 hover:text-foreground",
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-cyan" aria-hidden />
            )}
          </button>
        )
      })}
    </nav>
  )
}
