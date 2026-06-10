"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

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
}

export type ShopItem = {
  id: string
  name: string
  cost: number
  icon: "instagram" | "chips" | "book" | "coffee"
}

type GameState = {
  coins: number
  xp: number
  level: number
  streak: number
  tasks: Task[]
  shopItems: ShopItem[]
  toggleTask: (id: string) => void
  toggleSub: (taskId: string, subId: string) => void
  addTask: (task: Omit<Task, "id">) => void
  buyItem: (id: string) => void
  addShopItem: (item: Omit<ShopItem, "id">) => void
}

const GameContext = createContext<GameState | null>(null)

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Pixel Art Project Proposal",
    done: false,
    urgency: "Urgent",
    difficulty: "Easy",
    subtasks: [
      { id: "s1", title: "Write draft", done: true },
      { id: "s2", title: "Create assets", done: false },
    ],
  },
  { id: "t2", title: "Water the Plants", done: false, urgency: "Normal", difficulty: "Easy", subtasks: [] },
  { id: "t3", title: "Read Chapter 5", done: false, urgency: "Normal", difficulty: "Hard", subtasks: [] },
  {
    id: "t4",
    title: "Weekly Team Meeting",
    done: true,
    urgency: "Urgent",
    difficulty: "Normal",
    subtasks: [{ id: "s3", title: "Prepare slides", done: true }],
  },
  { id: "t5", title: "Grocery Shopping", done: false, urgency: "Normal", difficulty: "Easy", subtasks: [] },
  { id: "t6", title: "Code Review", done: false, urgency: "Normal", difficulty: "Normal", subtasks: [] },
  { id: "t7", title: "Finish Project Proposal", done: true, urgency: "Urgent", difficulty: "Hard", subtasks: [] },
]

const initialShop: ShopItem[] = [
  { id: "i1", name: "15 Mins Instagram", cost: 60, icon: "instagram" },
  { id: "i2", name: "Packet of Chips", cost: 200, icon: "chips" },
  { id: "i3", name: "30 Mins Reading", cost: 200, icon: "book" },
  { id: "i4", name: "Coffee Break", cost: 200, icon: "coffee" },
  { id: "i5", name: "Packet of Chips", cost: 100, icon: "chips" },
  { id: "i6", name: "30 Mins Reading", cost: 300, icon: "book" },
  { id: "i7", name: "Coffee Break", cost: 200, icon: "coffee" },
]

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(1250)
  const [xp] = useState(7400)
  const [level] = useState(15)
  const [streak] = useState(7)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [shopItems, setShopItems] = useState<ShopItem[]>(initialShop)

  const toggleTask = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))

  const toggleSub = (taskId: string, subId: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) }
          : t,
      ),
    )

  const addTask = (task: Omit<Task, "id">) =>
    setTasks((prev) => [...prev, { ...task, id: `t${Date.now()}` }])

  const buyItem = (id: string) => {
    const item = shopItems.find((i) => i.id === id)
    if (item && coins >= item.cost) setCoins((c) => c - item.cost)
  }

  const addShopItem = (item: Omit<ShopItem, "id">) =>
    setShopItems((prev) => [...prev, { ...item, id: `i${Date.now()}` }])

  return (
    <GameContext.Provider
      value={{ coins, xp, level, streak, tasks, shopItems, toggleTask, toggleSub, addTask, buyItem, addShopItem }}
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
