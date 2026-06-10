"use client"

import { useState } from "react"
import Image from "next/image"
import { useGame } from "@/lib/game-context"

// PixelEyeIcon – inline SVG eye in pixel style for the account detail toggles
function PixelEyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 20 14" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M1 7 C4 1, 16 1, 19 7 C16 13, 4 13, 1 7Z" stroke="#22e5e5" strokeWidth="1.5" fill="none" />
      <circle cx="10" cy="7" r="3" fill="#22e5e5" />
      <circle cx="10" cy="7" r="1.5" fill="oklch(0.22 0.04 220)" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 14" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M1 7 C4 1, 16 1, 19 7 C16 13, 4 13, 1 7Z" stroke="#22e5e5" strokeWidth="1.5" fill="none" />
      <circle cx="10" cy="7" r="3" stroke="#22e5e5" strokeWidth="1.5" fill="none" />
      <line x1="3" y1="11" x2="17" y2="3" stroke="#22e5e5" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

export function ProfileTab() {
  const { level, xp, coins, streak } = useGame()
  const [showEmail, setShowEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const email = "user_pixel@questmail.com"
  const password = "p1x3lQuest!2024"
  const xpCurrent = xp % 1000
  const xpMax = 1000
  const xpPct = Math.min(100, Math.round((xpCurrent / xpMax) * 100))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Single unified panel */}
      <section className="game-panel p-6 sm:p-8">

        {/* ── Heading ──────────────────────────────── */}
        <h2 className="mb-5 font-sans text-2xl tracking-widest text-foreground">
          USER PROFILE
        </h2>

        {/* ── Top row: avatar | stats | treasure ───── */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

          {/* Avatar — pixel-art male face */}
          <div
            className="game-panel flex-shrink-0 overflow-hidden"
            style={{ width: 120, height: 120 }}
          >
            <Image
              src="/icons/avatar-male.png"
              alt="User avatar"
              width={120}
              height={120}
              className="pixelated h-full w-full object-cover"
            />
          </div>

          {/* Username / Level / XP bar / Streak */}
          <div className="flex flex-1 flex-col gap-2">
            <p className="font-sans text-2xl tracking-widest text-foreground">USER_01</p>
            <p className="font-sans text-base tracking-widest text-foreground/80">
              LEVEL {level}
            </p>

            {/* XP progress bar — full width, green fill */}
            <div
              className="h-4 w-full border border-panel-border"
              style={{ background: "oklch(0.25 0.02 220 / 60%)" }}
              role="progressbar"
              aria-valuenow={xpPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`XP progress ${xpPct}%`}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${xpPct}%`,
                  background: "oklch(0.72 0.22 142)",
                }}
              />
            </div>

            {/* Streak — pixel fire icon */}
            <p className="flex items-center gap-2 font-sans text-base tracking-widest text-foreground">
              {streak} DAY STREAK{" "}
              <Image
                src="/icons/fire.png"
                alt="fire streak"
                width={24}
                height={24}
                className="pixelated"
              />
            </p>
          </div>

          {/* Treasure box */}
          <div className="game-panel flex-shrink-0 flex flex-col items-center justify-center gap-1 px-5 py-4 text-center min-w-[140px]">
            <p className="font-sans text-sm tracking-widest text-foreground/80">TREASURE</p>
            <div className="flex items-center gap-2">
              <Image
                src="/icons/coin.png"
                alt="Gold coin"
                width={40}
                height={40}
                className="pixelated"
              />
              <span className="font-sans text-3xl tracking-wide text-gold">
                {coins.toLocaleString()}
              </span>
            </div>
            <p className="font-sans text-xs tracking-widest text-foreground/70">GOLD COINS</p>
          </div>
        </div>

        {/* ── Divider ──────────────────────────────── */}
        <div
          className="my-6 w-full border-t"
          style={{ borderColor: "var(--panel-border)" }}
          aria-hidden
        />

        {/* ── Account Details ───────────────────────── */}
        <h3 className="mb-5 font-sans text-2xl tracking-widest text-foreground">
          ACCOUNT DETAILS
        </h3>

        <div className="space-y-5">
          {/* Email row */}
          <div className="flex items-center gap-4">
            <span
              className="w-28 flex-shrink-0 font-sans text-sm tracking-widest text-foreground"
            >
              EMAIL
            </span>
            <div
              className="flex flex-1 items-center border border-panel-border"
              style={{ background: "oklch(0.35 0.025 220 / 50%)" }}
            >
              <span className="flex-1 px-4 py-3 font-mono text-lg tracking-widest text-foreground/90">
                {showEmail ? email : "• • • • • • •"}
              </span>
              <button
                type="button"
                onClick={() => setShowEmail((v) => !v)}
                aria-label={showEmail ? "Hide email" : "Show email"}
                className="flex h-full items-center justify-center px-4 py-3 text-foreground/70 transition-colors hover:text-cyan"
              >
                <PixelEyeIcon open={showEmail} />
              </button>
            </div>
          </div>

          {/* Password row */}
          <div className="flex items-center gap-4">
            <span
              className="w-28 flex-shrink-0 font-sans text-sm tracking-widest text-foreground"
            >
              PASSWORD
            </span>
            <div
              className="flex flex-1 items-center border border-panel-border"
              style={{ background: "oklch(0.35 0.025 220 / 50%)" }}
            >
              <span className="flex-1 px-4 py-3 font-mono text-lg tracking-widest text-foreground/90">
                {showPassword ? password : "• • • • • • •"}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="flex h-full items-center justify-center px-4 py-3 text-foreground/70 transition-colors hover:text-cyan"
              >
                <PixelEyeIcon open={showPassword} />
              </button>
            </div>
          </div>
        </div>

      </section>
    </div>
  )
}
