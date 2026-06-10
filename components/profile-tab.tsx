"use client"

import { useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, Flame } from "lucide-react"
import { useGame } from "@/lib/game-context"

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="game-panel flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
      <span className="font-sans text-xs tracking-wide text-foreground/70">{label}</span>
      <span className={`font-sans text-xl tracking-wide ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  )
}

export function ProfileTab() {
  const { level, xp, coins, streak } = useGame()
  const [showEmail, setShowEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const email = "user_pixel@questmail.com"
  const password = "p1x3lQuest!2024"

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <section className="game-panel p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Image
            src="/icons/avatar.png"
            alt="User avatar"
            width={88}
            height={88}
            className="pixelated border border-panel-border"
          />
          <div className="text-center sm:text-left">
            <h2 className="font-sans text-2xl tracking-wide text-foreground">USER PROFILE</h2>
            <p className="font-mono text-xl text-foreground/70">USER ID: #PX-00015</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="LEVEL" value={`${level}`} accent="text-cyan" />
          <Stat label="XP" value={xp.toLocaleString()} />
          <Stat label="GOLD COINS" value={coins.toLocaleString()} accent="text-gold" />
          <div className="game-panel flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
            <span className="font-sans text-xs tracking-wide text-foreground/70">DAY STREAK</span>
            <span className="flex items-center gap-1 font-sans text-xl tracking-wide text-foreground">
              {streak} <Flame className="h-5 w-5 text-gold" fill="currentColor" />
            </span>
          </div>
        </div>
      </section>

      {/* Account details */}
      <section className="game-panel mt-6 p-6 sm:p-8">
        <h3 className="mb-5 font-sans text-xl tracking-wide text-foreground">ACCOUNT DETAILS</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">EMAIL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 border border-panel-border bg-input/40 px-3 py-2 font-mono text-lg text-foreground">
                {showEmail ? email : "•".repeat(email.length)}
              </div>
              <button
                type="button"
                onClick={() => setShowEmail((v) => !v)}
                aria-label={showEmail ? "Hide email" : "Unhide email"}
                className="flex h-[42px] w-[42px] items-center justify-center border border-panel-border bg-input/40 text-foreground transition-colors hover:border-cyan"
              >
                {showEmail ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">PASSWORD</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 border border-panel-border bg-input/40 px-3 py-2 font-mono text-lg text-foreground">
                {showPassword ? password : "•".repeat(password.length)}
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Unhide password"}
                className="flex h-[42px] w-[42px] items-center justify-center border border-panel-border bg-input/40 text-foreground transition-colors hover:border-cyan"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
