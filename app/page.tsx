"use client"

import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from "react"
import { MainApp } from "@/components/main-app"
import { api } from "@/lib/api"

// ─── Google "G" pixel-style SVG ────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ─── Shared background wrapper ──────────────────────────────────────────────
function PixelBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pixelated relative flex min-h-screen w-full items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url(/desk-bg.gif)" }}
    >
      <div className="absolute inset-0 bg-background/55" aria-hidden />
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}

// ─── Shared input ────────────────────────────────────────────────────────────
function PixelInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`
        w-full rounded-none border border-panel-border bg-panel px-4 py-3
        font-mono text-base text-foreground placeholder:text-foreground/40
        outline-none backdrop-blur-sm transition-colors
        focus:border-cyan focus:ring-0
        ${props.className ?? ""}
      `}
    />
  )
}

// ─── Shared primary button ───────────────────────────────────────────────────
function PixelButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="
        w-full border border-panel-border bg-panel px-6 py-3
        font-sans text-base tracking-widest text-foreground
        backdrop-blur-sm transition-colors hover:border-cyan hover:text-cyan
        disabled:opacity-50
      "
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN VIEW
// ─────────────────────────────────────────────────────────────────────────────
function LoginView({
  onLogin,
  onForgot,
  onRegisterRedirect,
}: {
  onLogin: () => void
  onForgot: () => void
  onRegisterRedirect: () => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await api.login(email.trim(), password.trim())
      onLogin()
    } catch (err: any) {
      setError(err.message || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PixelBackground>
      <form onSubmit={handleSubmit} className="game-panel flex flex-col gap-5 p-8">
        <h1 className="text-center font-sans text-2xl tracking-widest text-foreground">
          LOGIN
        </h1>

        {error && (
          <p className="text-center font-mono text-xs text-urgent">{error}</p>
        )}

        {/* Google button */}
        <button
          type="button"
          className="
            flex w-full items-center justify-center gap-3 border border-panel-border
            bg-panel px-6 py-3 font-mono text-base text-foreground backdrop-blur-sm
            transition-colors hover:border-cyan hover:text-cyan
          "
          onClick={() => setError("Google login is not yet available. Please use email & password.")}
          aria-label="Login with Google"
        >
          <GoogleIcon />
          Login with Google
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-dashed border-panel-border" />
          <span className="font-sans text-sm tracking-widest text-foreground/60">OR</span>
          <div className="flex-1 border-t border-dashed border-panel-border" />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-base text-foreground" htmlFor="login-email">
            Email
          </label>
          <PixelInput
            id="login-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-base text-foreground" htmlFor="login-password">
            Password
          </label>
          <PixelInput
            id="login-password"
            type="password"
            placeholder="*******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {/* Login button */}
        <PixelButton type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </PixelButton>

        <div className="flex flex-col gap-2 text-center mt-2">
          {/* Forgot password */}
          <button
            type="button"
            onClick={onForgot}
            className="font-mono text-sm text-cyan underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            Forgot Password?
          </button>
          
          {/* Sign up toggle */}
          <button
            type="button"
            onClick={onRegisterRedirect}
            className="font-mono text-sm text-cyan underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </form>
    </PixelBackground>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER VIEW
// ─────────────────────────────────────────────────────────────────────────────
function RegisterView({
  onRegister,
  onBack,
}: {
  onRegister: () => void
  onBack: () => void
}) {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !username.trim() || !password.trim()) {
      setError("Please fill in all fields.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await api.register(email.trim(), username.trim(), password.trim())
      onRegister()
    } catch (err: any) {
      setError(err.message || "Registration failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PixelBackground>
      <form onSubmit={handleSubmit} className="game-panel flex flex-col gap-5 p-8">
        <h1 className="text-center font-sans text-2xl tracking-widest text-foreground">
          CREATE ACCOUNT
        </h1>

        {error && (
          <p className="text-center font-mono text-xs text-urgent">{error}</p>
        )}

        {/* Username */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-base text-foreground" htmlFor="reg-username">
            Username
          </label>
          <PixelInput
            id="reg-username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-base text-foreground" htmlFor="reg-email">
            Email
          </label>
          <PixelInput
            id="reg-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-base text-foreground" htmlFor="reg-password">
            Password
          </label>
          <PixelInput
            id="reg-password"
            type="password"
            placeholder="*******"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Register button */}
        <PixelButton type="submit" disabled={loading}>
          {loading ? "Registering..." : "Sign Up"}
        </PixelButton>

        {/* Back to login */}
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-sm text-cyan underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          Already have an account? Login
        </button>
      </form>
    </PixelBackground>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD VIEW  (enter email → send OTP)
// ─────────────────────────────────────────────────────────────────────────────
function ForgotView({
  onSend,
  onBack,
}: {
  onSend: (email: string) => void
  onBack: () => void
}) {
  const [email, setEmail] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) onSend(email.trim())
  }

  return (
    <PixelBackground>
      <form onSubmit={handleSubmit} className="game-panel flex flex-col gap-6 p-8">
        <h1 className="text-center font-sans text-2xl tracking-widest text-foreground">
          FORGOT PASSWORD
        </h1>
        <p className="text-center font-mono text-sm text-foreground/70">
          Enter your registered email to receive an OTP
        </p>

        <div className="flex flex-col gap-2">
          <label className="font-mono text-base text-foreground" htmlFor="forgot-email">
            Email
          </label>
          <PixelInput
            id="forgot-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <PixelButton type="submit">SEND OTP</PixelButton>

        <button
          type="button"
          onClick={onBack}
          className="font-mono text-sm text-cyan underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          Back to Login
        </button>
      </form>
    </PixelBackground>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP VIEW  (4-box entry + verify)
// ─────────────────────────────────────────────────────────────────────────────
function OtpView({
  email,
  onVerify,
  onResend,
}: {
  email: string
  onVerify: () => void
  onResend: () => void
}) {
  const [digits, setDigits] = useState(["", "", "", ""])
  const [error, setError] = useState("")
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleChange(idx: number, val: string) {
    const char = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[idx] = char
    setDigits(next)
    setError("")
    if (char && idx < 3) refs[idx + 1].current?.focus()
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    const next = ["", "", "", ""]
    pasted.split("").forEach((c, i) => { next[i] = c })
    setDigits(next)
    refs[Math.min(pasted.length, 3)].current?.focus()
  }

  function handleVerify() {
    // Frontend-only: accept OTP "1234" or any 4-digit code
    const code = digits.join("")
    if (code.length < 4) {
      setError("Please enter all 4 digits.")
      return
    }
    onVerify()
  }

  return (
    <PixelBackground>
      <div className="game-panel flex flex-col gap-6 p-8">
        <h1 className="text-center font-sans text-2xl tracking-widest text-foreground">
          RESET PASSWORD
        </h1>
        <p className="text-center font-mono text-sm text-foreground/70">
          Enter the OTP sent to your email
        </p>
        <p className="text-center font-mono text-xs text-cyan">{email}</p>

        {/* 4 OTP boxes */}
        <div className="flex justify-center gap-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`OTP digit ${i + 1}`}
              className="
                h-16 w-14 border border-panel-border bg-panel text-center
                font-mono text-2xl text-foreground backdrop-blur-sm outline-none
                transition-colors focus:border-cyan
              "
            />
          ))}
        </div>

        {error && (
          <p className="text-center font-mono text-xs text-urgent">{error}</p>
        )}

        <PixelButton onClick={handleVerify}>VERIFY OTP</PixelButton>

        <button
          type="button"
          onClick={onResend}
          className="font-mono text-sm text-cyan underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          Resend Code
        </button>
      </div>
    </PixelBackground>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE — orchestrates all auth views
// ─────────────────────────────────────────────────────────────────────────────
type AuthView = "login" | "register" | "forgot" | "otp"

export default function Page() {
  const [view, setView] = useState<AuthView>("login")
  const [isAuthed, setIsAuthed] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        setIsAuthed(true)
      }
    }
  }, [])

  if (isAuthed) return <MainApp />

  if (view === "register") {
    return (
      <RegisterView
        onRegister={() => setIsAuthed(true)}
        onBack={() => setView("login")}
      />
    )
  }

  if (view === "forgot") {
    return (
      <ForgotView
        onSend={(email) => { setForgotEmail(email); setView("otp") }}
        onBack={() => setView("login")}
      />
    )
  }

  if (view === "otp") {
    return (
      <OtpView
        email={forgotEmail}
        onVerify={() => setIsAuthed(true)}
        onResend={() => {
          // Simulate resend — just reset to otp view freshly
          setView("forgot")
          setTimeout(() => setView("otp"), 10)
        }}
      />
    )
  }

  return (
    <LoginView
      onLogin={() => setIsAuthed(true)}
      onForgot={() => setView("forgot")}
      onRegisterRedirect={() => setView("register")}
    />
  )
}
