"use client"

import { useState } from "react"
import { GameProvider } from "@/lib/game-context"
import { TopNav, type Tab } from "@/components/top-nav"
import { DashboardTab } from "@/components/dashboard-tab"
import { TasksTab } from "@/components/tasks-tab"
import { ProfileTab } from "@/components/profile-tab"
import { ShopTab } from "@/components/shop-tab"

export default function Page() {
  const [tab, setTab] = useState<Tab>("dashboard")

  return (
    <GameProvider>
      <main
        className="pixelated relative min-h-screen w-full bg-cover bg-fixed bg-center"
        style={{ backgroundImage: "url(/desk-bg.gif)" }}
      >
        {/* Translucent dark overlay so panels read clearly */}
        <div className="absolute inset-0 z-0 bg-background/55" aria-hidden />

        <div className="relative z-10">
          <TopNav active={tab} onChange={setTab} />

          {tab === "dashboard" && <DashboardTab onAddTask={() => setTab("tasks")} />}
          {tab === "tasks" && <TasksTab />}
          {tab === "profile" && <ProfileTab />}
          {tab === "shop" && <ShopTab />}
        </div>
      </main>
    </GameProvider>
  )
}
