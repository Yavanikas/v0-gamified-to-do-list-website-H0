"use client"

import { useState } from "react"
import Image from "next/image"
import { useGame, type ShopItem } from "@/lib/game-context"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Settings } from "lucide-react"

function ItemCard({ item, onBuy, canAfford }: { item: ShopItem; onBuy: () => void; canAfford: boolean }) {
  if (item.claimed) return null // Hide claimed items in the store

  return (
    <div className="game-panel flex flex-col items-center gap-2 p-3 text-center">
      <Image src={`/icons/${item.icon}.png`} alt={item.name} width={48} height={48} className="pixelated" />
      <p className="font-sans text-xs leading-tight tracking-wide text-foreground">{item.name.toUpperCase()}</p>
      <p className="flex items-center gap-1">
        <Image src="/icons/coin.png" alt="" width={18} height={18} className="pixelated" />
        <span className="font-sans text-sm text-gold">{item.cost}</span>
      </p>
      <button
        type="button"
        onClick={onBuy}
        disabled={!canAfford}
        className="w-full border border-panel-border bg-input/40 py-1.5 font-sans text-xs tracking-wide text-foreground transition-colors hover:border-cyan disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY
      </button>
    </div>
  )
}

export function ShopTab() {
  const { shopItems, coins, buyItem, addShopItem, fetchData } = useGame()
  const [mode, setMode] = useState<"ai" | "manual">("ai")
  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [analyzed, setAnalyzed] = useState<number | null>(null)
  const [tempRewardId, setTempRewardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const addManual = async () => {
    if (!name.trim() || !cost) return
    setError("")
    try {
      await addShopItem({ name: name.trim(), cost: Number.parseInt(cost) || 100, icon: "chips" })
      setName("")
      setCost("")
    } catch (err: any) {
      setError(err.message || "Failed to add item.")
    }
  }

  const handleAnalyzeReward = async () => {
    if (!name.trim()) {
      setError("Please enter a reward name first.")
      return
    }
    setError("")
    setLoading(true)
    setAnalyzed(null)
    
    // If there is an existing temp reward that hasn't been added, delete it first
    if (tempRewardId) {
      try {
        await api.deleteReward(tempRewardId)
      } catch (_) {}
      setTempRewardId(null)
    }

    try {
      // 1. Create a temporary reward in the database
      const temp = await api.createReward(name.trim(), "AI pricing calculation temp", 100)
      // 2. Run analysis on that temporary reward
      const analysis = await api.analyzeReward(temp.id)
      setTempRewardId(temp.id)
      setAnalyzed(analysis.ai_suggested_cost)
    } catch (err: any) {
      setError(err.message || "Failed to analyze reward cost.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAiReward = async () => {
    if (!tempRewardId || analyzed === null) return
    setLoading(true)
    try {
      // Update the temporary reward's cost to the AI suggested cost
      await api.updateReward(tempRewardId, { cost: analyzed })
      await fetchData()
      setName("")
      setAnalyzed(null)
      setTempRewardId(null)
    } catch (err: any) {
      setError(err.message || "Failed to add reward.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAiReward = async () => {
    if (tempRewardId) {
      try {
        await api.deleteReward(tempRewardId)
        await fetchData()
      } catch (_) {}
    }
    setName("")
    setAnalyzed(null)
    setTempRewardId(null)
    setError("")
  }

  const field = "w-full border border-panel-border bg-input/40 px-3 py-2 font-mono text-lg text-foreground outline-none focus:border-cyan"

  const unclaimedItems = (shopItems || []).filter(item => !item.claimed)

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Rewards Market */}
      <section className="game-panel p-5 sm:p-6">
        <h2 className="mb-5 text-center font-sans text-2xl tracking-wide text-foreground">REWARDS MARKET</h2>
        {unclaimedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-foreground/50 font-sans">
            <p className="text-xl mb-2">SHOP IS EMPTY 🏪</p>
            <p className="text-sm">Create rewards on the right to stock up the market!</p>
          </div>
        ) : (
          <div className="thin-scroll grid max-h-[460px] grid-cols-2 gap-4 overflow-y-auto pr-2 sm:grid-cols-3 lg:grid-cols-4">
            {unclaimedItems.map((item) => (
              <ItemCard key={item.id} item={item} canAfford={coins >= item.cost} onBuy={() => buyItem(item.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Manage Inventory */}
      <section className="game-panel p-5 sm:p-6">
        <h2 className="mb-5 text-center font-sans text-2xl tracking-wide text-foreground">MANAGE INVENTORY</h2>

        {error && (
          <p className="font-mono text-xs text-urgent mb-4 text-center">{error}</p>
        )}

        <div className="mb-5 grid grid-cols-2">
          <button
            type="button"
            onClick={handleCancelAiReward}
            className={cn(
              "border-b-2 py-2 font-sans text-sm tracking-wide transition-colors",
              mode === "ai" ? "border-cyan bg-cyan/10 text-cyan" : "border-panel-border text-foreground/70",
            )}
          >
            AI PRICING
          </button>
          <button
            type="button"
            onClick={() => { handleCancelAiReward(); setMode("manual"); }}
            className={cn(
              "border-b-2 py-2 font-sans text-sm tracking-wide transition-colors",
              mode === "manual" ? "border-cyan bg-cyan/10 text-cyan" : "border-panel-border text-foreground/70",
            )}
          >
            MANUAL
          </button>
        </div>

        {mode === "ai" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">REWARD NAME</label>
              <input
                className={field}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="e.g. 1 hour of gaming"
                disabled={loading || tempRewardId !== null}
              />
            </div>

            {analyzed === null && (
              <button
                type="button"
                onClick={handleAnalyzeReward}
                disabled={loading || !name.trim()}
                className="w-full border border-panel-border bg-input/40 py-3 font-sans text-sm tracking-wide text-foreground transition-colors hover:border-cyan disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "ANALYZING..." : "ANALYZE REWARD VALUE"} <Settings className={cn("h-4 w-4 text-cyan", loading && "animate-spin")} />
              </button>
            )}

            <p className="font-sans text-xs tracking-wide text-foreground/60 text-center">
              Groq Llama 3.1 AI will calculate a fair points cost for your reward.
            </p>

            {analyzed !== null && (
              <div className="border border-cyan/50 bg-cyan/10 p-4">
                <p className="font-sans text-sm tracking-wide text-foreground text-center">
                  AI SUGGESTS: <span className="text-gold font-bold">{analyzed} COINS</span>
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleConfirmAiReward}
                    disabled={loading}
                    className="flex-1 border border-cyan/60 bg-cyan/15 py-2 font-sans text-xs tracking-wide text-foreground hover:bg-cyan/25"
                  >
                    ADD TO SHOP
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAiReward}
                    disabled={loading}
                    className="flex-1 border border-panel-border bg-input/40 py-2 font-sans text-xs tracking-wide text-foreground/70 hover:bg-input/60"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-sans text-sm tracking-wide text-foreground">MANUAL</p>
            <div>
              <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">ITEM NAME</label>
              <input 
                className={field} 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Cheat meal"
              />
            </div>
            <div>
              <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">COIN COST</label>
              <input
                className={field}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 150"
                inputMode="numeric"
              />
            </div>
            <button
              type="button"
              onClick={addManual}
              disabled={!name.trim() || !cost}
              className="w-full border border-cyan/60 bg-cyan/10 py-3 font-sans text-sm tracking-wide text-foreground transition-colors hover:bg-cyan/20 disabled:opacity-50"
            >
              ADD ITEM
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
