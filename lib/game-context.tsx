"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { api } from "@/lib/api"

export type Difficulty = "Easy" | "Normal" | "Hard"
export type Urgency = "Urgent" | "Normal"

export type SubTask = {
  id: string
  title: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  done: boolean
  urgency: Urgency
  difficulty: Difficulty
  subtasks: SubTask[]
  bonus_points?: number
  bonus_reason?: string
}

export type ShopItem = {
  id: string
  name: string
  cost: number
  icon: "instagram" | "chips" | "book" | "coffee"
  claimed?: boolean
  ai_suggested_cost?: number | null
  ai_reason?: string | null
}

type GameState = {
  coins: number
  xp: number
  level: number
  streak: number
  tasks: Task[]
  shopItems: ShopItem[]
  loading: boolean
  fetchData: () => Promise<void>
  toggleTask: (id: string) => Promise<void>
  toggleSub: (taskId: string, subId: string) => Promise<void>
  addTask: (task: { title: string; urgency: Urgency; difficulty: Difficulty; subtasksCount: number; isAi: boolean }) => Promise<void>
  buyItem: (id: string) => Promise<void>
  addShopItem: (item: Omit<ShopItem, "id">) => Promise<void>
}

const GameContext = createContext<GameState | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(0)
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [streak] = useState(7) // default streak
  const [tasks, setTasks] = useState<Task[]>([])
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)

  const mapBackendTask = (t: any): Task => {
    return {
      id: t.id,
      title: t.title,
      done: t.status === "completed",
      urgency: t.priority === "high" ? "Urgent" : "Normal",
      difficulty: t.priority === "low" ? "Easy" : t.priority === "high" ? "Hard" : "Normal",
      subtasks: (t.subtasks || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        done: s.status === "completed",
      })),
      bonus_points: t.bonus_points,
      bonus_reason: t.bonus_reason,
    }
  }

  const mapBackendReward = (r: any): ShopItem => {
    let icon: "instagram" | "chips" | "book" | "coffee" = "coffee"
    const nameLower = r.name.toLowerCase()
    if (nameLower.includes("instagram") || nameLower.includes("social")) icon = "instagram"
    else if (nameLower.includes("chip") || nameLower.includes("snack") || nameLower.includes("food")) icon = "chips"
    else if (nameLower.includes("read") || nameLower.includes("book") || nameLower.includes("study")) icon = "book"

    return {
      id: r.id,
      name: r.name,
      cost: r.cost,
      icon,
      claimed: r.claimed,
      ai_suggested_cost: r.ai_suggested_cost,
      ai_reason: r.ai_reason,
    }
  }

  const fetchData = async () => {
    try {
      const [tasksData, rewardsData, statsData] = await Promise.all([
        api.getTasks(),
        api.getRewards(),
        api.getUserStats(),
      ])

      setTasks(tasksData.map(mapBackendTask))
      // Filter out claimed rewards or keep them for display
      setShopItems(rewardsData.map(mapBackendReward))
      
      const totalPoints = statsData.points_and_level.total_points
      setCoins(totalPoints)
      setXp(totalPoints * 10)
      setLevel(statsData.points_and_level.level)
    } catch (err) {
      console.error("Error fetching game data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const newStatus = task.done ? "not_started" : "completed"
    try {
      await api.updateTaskStatus(id, newStatus)
      await fetchData()
    } catch (err) {
      console.error("Error toggling task:", err)
    }
  }

  const toggleSub = async (taskId: string, subId: string) => {
    try {
      await api.completeSubtask(subId)
      await fetchData()
    } catch (err) {
      console.error("Error completing subtask:", err)
    }
  }

  const addTask = async (task: { title: string; urgency: Urgency; difficulty: Difficulty; subtasksCount: number; isAi: boolean }) => {
    // Map urgency/difficulty to backend priority
    let priority = "medium"
    if (task.urgency === "Urgent" || task.difficulty === "Hard") {
      priority = "high"
    } else if (task.difficulty === "Easy") {
      priority = "low"
    }

    try {
      const createdTask = await api.createTask(task.title, "", priority)
      if (task.isAi) {
        // AI breakdown triggers subtask generation on the backend
        await api.breakdownTask(createdTask.id)
      } else if (task.subtasksCount > 0) {
        // Manually create N subtasks
        for (let i = 0; i < task.subtasksCount; i++) {
          await api.addSubtask(createdTask.id, `Subtask ${i + 1}`)
        }
      }
      await fetchData()
    } catch (err) {
      console.error("Error adding task:", err)
      throw err
    }
  }

  const buyItem = async (id: string) => {
    try {
      await api.claimReward(id)
      await fetchData()
    } catch (err) {
      console.error("Error buying item:", err)
    }
  }

  const addShopItem = async (item: Omit<ShopItem, "id">) => {
    try {
      await api.createReward(item.name, "", item.cost)
      await fetchData()
    } catch (err) {
      console.error("Error adding shop item:", err)
    }
  }

  return (
    <GameContext.Provider
      value={{
        coins,
        xp,
        level,
        streak,
        tasks,
        shopItems,
        loading,
        fetchData,
        toggleTask,
        toggleSub,
        addTask,
        buyItem,
        addShopItem,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}
