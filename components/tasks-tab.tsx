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
  
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-foreground/50 font-sans">
        <p className="text-xl mb-2">NO ACTIVE TASKS 📝</p>
        <p className="text-sm">Create a task on the right to start earning points!</p>
      </div>
    )
  }

  return (
    <ul className="thin-scroll max-h-[460px] space-y-3 overflow-y-auto pr-2">
      {tasks.map((task, i) => (
        <li key={task.id} className={cn(i !== 0 && "border-t border-panel-border/50 pt-3")}>
          <div className="flex items-center gap-3 pb-2">
            <PixelCheckbox checked={task.done} onChange={() => toggleTask(task.id)} />
            <div className="flex-1 flex flex-col">
              <span
                className={cn(
                  "font-sans text-base uppercase tracking-wide sm:text-lg",
                  task.done ? "text-foreground/55 line-through" : "text-foreground",
                )}
              >
                {task.title}
              </span>
              {task.bonus_reason && (
                <span className="font-mono text-xs text-cyan/70 mt-0.5 leading-tight">
                  AI: {task.bonus_reason}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {task.bonus_points && (
                <span className="font-mono text-xs border border-gold/40 text-gold px-1.5 py-0.5 bg-gold/10">
                  +{task.bonus_points} pts
                </span>
              )}
              <Tag kind={task.urgency === "Urgent" ? "urgent" : "normal"} label={task.urgency} />
              <span className="text-foreground/40 text-xs">,</span>
              <Tag
                kind={task.difficulty === "Easy" ? "easy" : task.difficulty === "Hard" ? "hard" : "normal"}
                label={task.difficulty}
              />
            </div>
          </div>
          {(task.subtasks || []).map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 pb-2 pl-6">
              {/* Pixel-art corner arrow for subtask indent */}
              <svg viewBox="0 0 14 14" className="h-4 w-4 shrink-0 text-cyan/70" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M2 2 L2 10 L12 10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
                <path d="M9 7 L12 10 L9 13" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
              </svg>
              <PixelCheckbox checked={sub.done} onChange={() => toggleSub(task.id, sub.id)} className="h-5 w-5" />
              <span
                className={cn(
                  "font-mono text-base tracking-wide",
                  sub.done ? "text-foreground/55 line-through" : "text-foreground",
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

export function TasksTab() {
  const { addTask } = useGame()
  const [mode, setMode] = useState<"ai" | "manual">("ai")
  const [title, setTitle] = useState("")
  const [subs, setSubs] = useState("3")
  const [urgency, setUrgency] = useState<Urgency>("Normal")
  const [difficulty, setDifficulty] = useState<Difficulty>("Normal")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const field = "w-full border border-panel-border bg-input/40 px-3 py-2 font-mono text-lg text-foreground outline-none focus:border-cyan"
  const label = "mb-1 block font-sans text-xs tracking-wide text-foreground/80"

  const handleCreateTask = async () => {
    if (!title.trim()) {
      setError("Please enter a task name.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await addTask({
        title: title.trim(),
        urgency,
        difficulty,
        subtasksCount: mode === "manual" ? Math.max(0, Number.parseInt(subs) || 0) : 0,
        isAi: mode === "ai",
      })
      setTitle("")
      setSubs("3")
    } catch (err: any) {
      setError(err.message || "Failed to create task.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.5fr_1fr]">
      {/* Task list panel */}
      <section className="game-panel p-5 sm:p-6">
        <h2 className="mb-5 font-sans text-2xl tracking-wide text-foreground uppercase border-b border-panel-border/30 pb-3">Tasks Log</h2>
        <TaskRow />
      </section>

      {/* Rewards & Grading panel */}
      <section className="game-panel flex flex-col p-5 sm:p-6 justify-between min-h-[480px]">
        <div>
          <h2 className="mb-5 font-sans text-2xl tracking-wide text-foreground">REWARDS &amp; GRADING</h2>

          {error && (
            <p className="font-mono text-xs text-urgent mb-4">{error}</p>
          )}

          {/* Task Name */}
          <div className="mb-4">
            <label className={label}>TASK NAME</label>
            <input 
              className={field} 
              value={title} 
              onChange={(e) => { setTitle(e.target.value); setError(""); }} 
              placeholder="e.g. Finish physics report..." 
              required
            />
          </div>

          {/* Mode Tabs */}
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

          {/* Tab Content */}
          <div className="flex-1">
            {mode === "ai" ? (
              <div className="space-y-4">
                <div className="border border-cyan/40 bg-cyan/5 p-4 rounded-none">
                  <div className="flex items-center gap-2 font-sans text-base tracking-wide text-foreground mb-2">
                    AI GRADING ACTIVE <Settings className="h-4 w-4 text-cyan animate-spin" />
                  </div>
                  <p className="font-mono text-xs leading-relaxed text-foreground/70">
                    Groq Llama 3.1 will automatically breakdown this task into 5 to 8 detailed subtasks and reward you dynamic bonus points (up to 200 pts) based on its difficulty.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>URGENCY</label>
                    <select 
                      className={cn(field, "text-white")} 
                      style={{ backgroundColor: "#1B2D34" }}
                      value={urgency} 
                      onChange={(e) => setUrgency(e.target.value as Urgency)}
                    >
                      <option>Normal</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>DIFFICULTY</label>
                    <select 
                      className={cn(field, "text-white")} 
                      style={{ backgroundColor: "#1B2D34" }}
                      value={difficulty} 
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    >
                      <option>Easy</option>
                      <option>Normal</option>
                      <option>Hard</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={label}>NUMBER OF SUBTASKS</label>
                  <input 
                    className={field} 
                    type="number"
                    min="0"
                    max="15"
                    value={subs} 
                    onChange={(e) => setSubs(e.target.value)} 
                    inputMode="numeric" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleCreateTask}
          disabled={loading || !title.trim()}
          className="mt-6 w-full border border-cyan/60 bg-cyan/10 py-4 font-sans text-lg tracking-wider text-foreground transition-colors hover:bg-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
        >
          {loading ? "Generating Task..." : "Create New Task"}
        </button>
      </section>
    </div>
  )
}
