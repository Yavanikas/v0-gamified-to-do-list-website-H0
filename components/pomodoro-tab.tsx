"use client"

import { useEffect, useState } from "react"
import { useGame } from "@/lib/game-context"
import { cn } from "@/lib/utils"

export function PomodoroTab() {
  const { tasks } = useGame()
  const [selectedTaskId, setSelectedTaskId] = useState<string | "custom">("custom")
  const [customTaskName, setCustomTaskName] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [customMinutes, setCustomMinutes] = useState("25")
  const [customSeconds, setCustomSeconds] = useState("00")
  const [autoRepeat, setAutoRepeat] = useState(false)

  // Timer loop
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (autoRepeat) {
            return totalSeconds
          } else {
            setIsRunning(false)
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, autoRepeat, totalSeconds])

  const handleSetCustomTime = () => {
    const mins = Math.max(0, Math.min(59, parseInt(customMinutes) || 0))
    const secs = Math.max(0, Math.min(59, parseInt(customSeconds) || 0))
    const newTotal = mins * 60 + secs
    setTotalSeconds(newTotal)
    setRemainingSeconds(newTotal)
    setCustomMinutes(String(mins))
    setCustomSeconds(String(secs).padStart(2, "0"))
  }

  const handleStart = () => {
    if (remainingSeconds > 0) setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setRemainingSeconds(totalSeconds)
  }

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const displayTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  const getCurrentTask = () => {
    if (selectedTaskId === "custom") {
      return customTaskName || "No task selected"
    }
    return tasks.find((t) => t.id === selectedTaskId)?.title || "Task"
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="game-panel w-full max-w-2xl space-y-8 p-8">
        {/* Task Selector */}
        <div className="flex items-center gap-4">
          <label className="font-sans text-sm tracking-widest text-foreground/70">SELECT TASK</label>
          <select
            value={selectedTaskId}
            onChange={(e) => {
              setSelectedTaskId(e.target.value as string)
              setCustomTaskName("")
            }}
            className="flex-1 rounded border border-panel-border px-3 py-2 font-sans text-sm text-white placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-cyan"
            style={{ backgroundColor: "#1B2D34" }}
          >
            <option>Custom Task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Task Input */}
        {selectedTaskId === "custom" && (
          <div>
            <label className="block font-sans text-xs tracking-widest text-foreground/70 mb-2">
              CUSTOM TASK NAME
            </label>
            <input
              type="text"
              value={customTaskName}
              onChange={(e) => setCustomTaskName(e.target.value)}
              placeholder="Enter task name..."
              className="w-full rounded border border-panel-border bg-input/40 px-3 py-2 font-sans text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-cyan"
            />
          </div>
        )}

        {/* Timer Display */}
        <div className="flex flex-col items-center gap-6">
          <div className="pixelated text-7xl font-bold text-cyan drop-shadow-lg" style={{ letterSpacing: "0.15em" }}>
            {displayTime}
          </div>
          <p className="font-sans text-sm text-foreground/70 text-center">
            {getCurrentTask()}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className={cn(
              "game-panel px-6 py-3 font-sans font-bold tracking-widest transition-all disabled:opacity-50",
              "text-white",
              isRunning ? "bg-green/50 cursor-not-allowed" : "bg-[#4ade80] hover:bg-[#5acb91]",
            )}
          >
            START
          </button>
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className={cn(
              "game-panel px-6 py-3 font-sans font-bold tracking-widest transition-all disabled:opacity-50",
              "text-white",
              !isRunning ? "bg-yellow-600/50 cursor-not-allowed" : "bg-[#fbbf24] hover:bg-[#fcd34d]",
            )}
          >
            PAUSE
          </button>
          <button
            onClick={handleReset}
            className="game-panel px-6 py-3 font-sans font-bold tracking-widest bg-[#ef4444] text-white transition-all hover:bg-[#f87171]"
          >
            RESET
          </button>
        </div>

        {/* Custom Mode Panel */}
        <div className="game-panel space-y-4 p-6">
          <h3 className="font-sans text-base tracking-widest text-foreground">CUSTOM MODE</h3>

          {/* Time Input Fields */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-2">
              <input
                type="number"
                min="0"
                max="59"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-24 rounded border border-panel-border bg-input/40 px-2 py-2 text-center font-mono text-lg text-foreground focus:outline-none focus:ring-1 focus:ring-cyan"
              />
              <span className="font-sans text-xs text-foreground/50">MM</span>
            </div>
            <span className="font-sans text-2xl text-foreground">:</span>
            <div className="flex flex-col items-center gap-2">
              <input
                type="number"
                min="0"
                max="59"
                value={customSeconds}
                onChange={(e) => setCustomSeconds(e.target.value)}
                className="w-24 rounded border border-panel-border bg-input/40 px-2 py-2 text-center font-mono text-lg text-foreground focus:outline-none focus:ring-1 focus:ring-cyan"
              />
              <span className="font-sans text-xs text-foreground/50">SS</span>
            </div>
          </div>

          {/* Set Custom Time Button */}
          <button
            onClick={handleSetCustomTime}
            className="w-full game-panel px-4 py-2 font-sans text-sm tracking-widest text-foreground/70 border border-panel-border hover:text-cyan transition-colors"
          >
            SET TIME
          </button>

          {/* Auto-Repeat Toggle */}
          <div className="flex items-center justify-between pt-4">
            <label className="font-sans text-sm tracking-widest text-foreground/70">AUTO-REPEAT</label>
            <button
              onClick={() => setAutoRepeat(!autoRepeat)}
              className={cn(
                "relative h-6 w-12 rounded-full transition-colors",
                autoRepeat ? "bg-cyan" : "bg-panel-border",
              )}
            >
              <div
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-background transition-transform",
                  autoRepeat ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
