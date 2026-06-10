"use client"

import Image from "next/image"
import { Flame } from "lucide-react"
import { useGame } from "@/lib/game-context"
import { PixelCheckbox } from "@/components/pixel-checkbox"

export function DashboardTab({ onAddTask }: { onAddTask: () => void }) {
  const { tasks, coins, level, xp, streak, toggleTask } = useGame()
  const xpPct = Math.min(100, Math.round(((xp % 1000) / 1000) * 100)) || 80

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Tasks at hand */}
      <section className="game-panel p-5 sm:p-6">
        <h2 className="mb-5 font-sans text-2xl tracking-wide text-foreground sm:text-3xl">TASKS AT HAND</h2>
        <ul className="thin-scroll max-h-[420px] space-y-4 overflow-y-auto pr-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-4">
              <PixelCheckbox checked={task.done} onChange={() => toggleTask(task.id)} />
              <span
                className={`font-sans text-base uppercase tracking-wide sm:text-lg ${
                  task.done ? "text-foreground/55" : "text-foreground"
                }`}
              >
                {task.title}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onAddTask}
          className="mt-6 w-full border border-cyan/60 bg-cyan/10 py-3 font-sans text-sm tracking-wider text-foreground transition-colors hover:bg-cyan/20 sm:w-auto sm:px-12"
        >
          ADD NEW TASK
        </button>
      </section>

      {/* Right column */}
      <div className="flex flex-col gap-6">
        {/* Treasure */}
        <div className="game-panel flex items-center justify-between px-5 py-4">
          <span className="font-sans text-lg tracking-wide text-foreground sm:text-xl">TREASURE</span>
          <span className="flex items-center gap-2">
            <Image src="/icons/coin.png" alt="coins" width={28} height={28} className="pixelated" />
            <span className="font-sans text-lg text-gold sm:text-xl">{coins.toLocaleString()}</span>
          </span>
        </div>

        {/* User profile + stats */}
        <div className="game-panel p-5 sm:p-6">
          <h3 className="mb-4 font-sans text-xl tracking-wide text-foreground sm:text-2xl">USER PROFILE</h3>
          <div className="mb-5 flex items-center gap-4">
            <Image
              src="/icons/avatar.png"
              alt="User avatar"
              width={56}
              height={56}
              className="pixelated border border-panel-border"
            />
            <p className="font-sans text-base leading-tight tracking-wide text-foreground">
              WELCOME
              <br />
              BACK, USER!
            </p>
          </div>

          <div className="mb-3 h-px w-full bg-panel-border" />

          <h3 className="mb-4 font-sans text-xl tracking-wide text-foreground sm:text-2xl">STATS</h3>
          <p className="mb-2 font-sans text-base tracking-wide text-foreground">LEVEL {level}</p>
          <div className="mb-5 h-3 w-full border border-panel-border bg-input/40">
            <div className="h-full bg-cyan/70" style={{ width: `${xpPct}%` }} />
          </div>
          <p className="flex items-center gap-2 font-sans text-base tracking-wide text-foreground">
            {streak} DAY STREAK <Flame className="h-5 w-5 text-gold" fill="currentColor" />
          </p>
        </div>
      </div>
    </div>
  )
}
