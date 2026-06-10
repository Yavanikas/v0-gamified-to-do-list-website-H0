"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import { useGame, type Difficulty, type Urgency } from "@/lib/game-context"
import { PixelCheckbox } from "@/components/pixel-checkbox"
import { cn } from "@/lib/utils"

function Tag({ kind, label }: { kind: "urgent" | "easy" | "hard" | "normal"; label: string }) {
  return (
    <span
      className={cn(
        "font-sans text-sm tracking-wide",
        kind === "urgent" && "text-urgent",
        kind === "hard" && "text-hard",
        kind === "easy" && "text-easy",
        kind === "normal" && "text-foreground/70",
      )}
    >
      {label}
    </span>
  )
}

function TaskRow() {
  const { tasks, toggleTask, toggleSub } = useGame()
  return (
    <ul className="thin-scroll max-h-[460px] space-y-1 overflow-y-auto pr-2">
      {tasks.map((task, i) => (
        <li key={task.id} className={cn(i !== 0 && "border-t border-panel-border/50 pt-3")}>
          <div className="flex items-center gap-3 pb-2">
            <PixelCheckbox checked={task.done} onChange={() => toggleTask(task.id)} />
            <span
              className={cn(
                "flex-1 font-sans text-base uppercase tracking-wide sm:text-lg",
                task.done ? "text-foreground/55" : "text-foreground",
              )}
            >
              {task.title}
            </span>
            <span className="flex items-center gap-2">
              <Tag kind={task.urgency === "Urgent" ? "urgent" : "normal"} label={task.urgency} />
              <span className="text-foreground/40">,</span>
              <Tag
                kind={task.difficulty === "Easy" ? "easy" : task.difficulty === "Hard" ? "hard" : "normal"}
                label={task.difficulty}
              />
            </span>
          </div>
          {task.subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 pb-2 pl-6">
              <span className="font-sans text-cyan/70">↳</span>
              <PixelCheckbox checked={sub.done} onChange={() => toggleSub(task.id, sub.id)} className="h-5 w-5" />
              <span
                className={cn(
                  "font-mono text-xl tracking-wide",
                  sub.done ? "text-foreground/55" : "text-foreground",
                )}
              >
                {sub.title}
              </span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  )
}

function AiGrading() {
  const [analyzed, setAnalyzed] = useState(false)
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setAnalyzed(true)}
        className="flex w-full items-center justify-center gap-2 border border-panel-border bg-input/40 py-3 font-sans text-sm tracking-wide text-foreground transition-colors hover:border-cyan"
      >
        ANALYZE TASK WITH AI <Settings className="h-4 w-4" />
      </button>
      <div>
        <p className="font-sans text-base tracking-wide text-foreground">ESTIMATED REWARDS:</p>
        <p className="font-sans text-base tracking-wide text-foreground">
          {analyzed ? "180 XP, 300 COINS" : "150 XP, 250 COINS"}
        </p>
      </div>
    </div>
  )
}

function ManualGrading() {
  const { addTask } = useGame()
  const [title, setTitle] = useState("")
  const [coins, setCoins] = useState("250")
  const [xp, setXp] = useState("150")
  const [subs, setSubs] = useState("0")
  const [urgency, setUrgency] = useState<Urgency>("Normal")
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy")

  const create = () => {
    if (!title.trim()) return
    const n = Math.max(0, Number.parseInt(subs) || 0)
    addTask({
      title,
      done: false,
      urgency,
      difficulty,
      subtasks: Array.from({ length: n }, (_, i) => ({ id: `ns${i}-${Date.now()}`, title: `Subtask ${i + 1}`, done: false })),
    })
    setTitle("")
  }

  const field = "w-full border border-panel-border bg-input/40 px-3 py-2 font-mono text-lg text-foreground outline-none focus:border-cyan"
  const label = "mb-1 block font-sans text-xs tracking-wide text-foreground/80"

  return (
    <div className="space-y-3">
      <div>
        <label className={label}>TASK NAME</label>
        <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>COINS</label>
          <input className={field} value={coins} onChange={(e) => setCoins(e.target.value)} inputMode="numeric" />
        </div>
        <div>
          <label className={label}>XP</label>
          <input className={field} value={xp} onChange={(e) => setXp(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <div>
        <label className={label}>SUBTASKS</label>
        <input className={field} value={subs} onChange={(e) => setSubs(e.target.value)} inputMode="numeric" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>URGENCY</label>
          <select className={field} value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
            <option>Urgent</option>
            <option>Normal</option>
          </select>
        </div>
        <div>
          <label className={label}>DIFFICULTY</label>
          <select className={field} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            <option>Easy</option>
            <option>Normal</option>
            <option>Hard</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export function TasksTab() {
  const [mode, setMode] = useState<"ai" | "manual">("ai")

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="game-panel p-5 sm:p-6">
        <TaskRow />
      </section>

      <section className="game-panel flex flex-col p-5 sm:p-6">
        <h2 className="mb-5 font-sans text-2xl tracking-wide text-foreground">REWARDS &amp; GRADING</h2>

        <div className="mb-5 grid grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={cn(
              "border-b-2 py-2 font-sans text-sm tracking-wide transition-colors",
              mode === "ai" ? "border-cyan bg-cyan/10 text-cyan" : "border-panel-border text-foreground/70",
            )}
          >
            AI GRADING
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "border-b-2 py-2 font-sans text-sm tracking-wide transition-colors",
              mode === "manual" ? "border-cyan bg-cyan/10 text-cyan" : "border-panel-border text-foreground/70",
            )}
          >
            MANUAL
          </button>
        </div>

        <div className="flex-1">{mode === "ai" ? <AiGrading /> : <ManualGrading />}</div>

        <button
          type="button"
          className="mt-6 w-full border border-cyan/60 bg-cyan/10 py-4 font-sans text-lg tracking-wider text-foreground transition-colors hover:bg-cyan/20"
        >
          CREATE NEW TASK
        </button>
      </section>
    </div>
  )
}
