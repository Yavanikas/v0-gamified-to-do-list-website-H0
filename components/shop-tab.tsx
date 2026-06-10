"use client"

import { useState } from "react"
import Image from "next/image"
import { useGame, type ShopItem } from "@/lib/game-context"
import { cn } from "@/lib/utils"

function ItemCard({ item, onBuy, canAfford }: { item: ShopItem; onBuy: () => void; canAfford: boolean }) {
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
  const { shopItems, coins, buyItem, addShopItem } = useGame()
  const [mode, setMode] = useState<"ai" | "manual">("ai")
  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [analyzed, setAnalyzed] = useState<number | null>(null)

  const addManual = () => {
    if (!name.trim() || !cost) return
    addShopItem({ name, cost: Number.parseInt(cost) || 0, icon: "chips" })
    setName("")
    setCost("")
  }

  const field = "w-full border border-panel-border bg-input/40 px-3 py-2 font-mono text-lg text-foreground outline-none focus:border-cyan"

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Rewards Market */}
      <section className="game-panel p-5 sm:p-6">
        <h2 className="mb-5 text-center font-sans text-2xl tracking-wide text-foreground">REWARDS MARKET</h2>
        <div className="thin-scroll grid max-h-[460px] grid-cols-2 gap-4 overflow-y-auto pr-2 sm:grid-cols-3 lg:grid-cols-4">
          {shopItems.map((item) => (
            <ItemCard key={item.id} item={item} canAfford={coins >= item.cost} onBuy={() => buyItem(item.id)} />
          ))}
        </div>
      </section>

      {/* Manage Inventory */}
      <section className="game-panel p-5 sm:p-6">
        <h2 className="mb-5 text-center font-sans text-2xl tracking-wide text-foreground">MANAGE INVENTORY</h2>

        <div className="mb-5 grid grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={cn(
              "border-b-2 py-2 font-sans text-sm tracking-wide transition-colors",
              mode === "ai" ? "border-cyan bg-cyan/10 text-cyan" : "border-panel-border text-foreground/70",
            )}
          >
            AI PRICING
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

        {mode === "ai" ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setAnalyzed(Math.floor(Math.random() * 200) + 100)}
              className="w-full border border-panel-border bg-input/40 py-3 font-sans text-sm tracking-wide text-foreground transition-colors hover:border-cyan"
            >
              ANALYZE REWARD VALUE
            </button>
            <p className="font-sans text-sm tracking-wide text-foreground/80">ESTIMATE COIN COSTS VIA AI</p>
            <div>
              <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">REWARD NAME</label>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bag of Chips"
              />
            </div>
            {analyzed !== null && (
              <div className="border border-cyan/50 bg-cyan/10 p-3">
                <p className="font-sans text-sm tracking-wide text-foreground">
                  AI SUGGESTS: <span className="text-gold">{analyzed} COINS</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (name.trim()) addShopItem({ name, cost: analyzed, icon: "chips" })
                    setName("")
                    setAnalyzed(null)
                  }}
                  className="mt-3 w-full border border-cyan/60 bg-cyan/10 py-2 font-sans text-xs tracking-wide text-foreground hover:bg-cyan/20"
                >
                  ADD TO SHOP
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-sans text-sm tracking-wide text-foreground">MANUAL</p>
            <div>
              <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">ITEM NAME</label>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block font-sans text-xs tracking-wide text-foreground/80">COIN COST</label>
              <input
                className={field}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <button
              type="button"
              onClick={addManual}
              className="w-full border border-cyan/60 bg-cyan/10 py-3 font-sans text-sm tracking-wide text-foreground transition-colors hover:bg-cyan/20"
            >
              ADD ITEM
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
