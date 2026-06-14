const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

function getHeaders(extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }
  return headers
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = "An error occurred"
    try {
      const data = await res.json()
      message = data.detail || message
    } catch (_) {
      try {
        message = await res.text()
      } catch (_) {}
    }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await handleResponse(res)
    if (typeof window !== "undefined") {
      localStorage.setItem("token", data.token)
      localStorage.setItem("username", data.username)
      localStorage.setItem("email", data.email)
    }
    return data
  },

  async register(email: string, username: string, password: string) {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    })
    const data = await handleResponse(res)
    if (typeof window !== "undefined") {
      localStorage.setItem("token", data.token)
      localStorage.setItem("username", data.username)
      localStorage.setItem("email", data.email)
    }
    return data
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("username")
      localStorage.removeItem("email")
    }
  },

  // Tasks
  async getTasks() {
    const res = await fetch(`${API_URL}/tasks`, {
      method: "GET",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async createTask(title: string, description: string = "", priority: string = "medium", due_date: string | null = null) {
    const res = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ title, description, priority, due_date }),
    })
    return handleResponse(res)
  },

  async updateTask(id: string, updates: { title?: string; description?: string; priority?: string; due_date?: string | null }) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
    return handleResponse(res)
  },

  async deleteTask(id: string) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async updateTaskStatus(id: string, status: string) {
    const res = await fetch(`${API_URL}/tasks/${id}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    })
    return handleResponse(res)
  },

  // Subtasks
  async breakdownTask(id: string) {
    const res = await fetch(`${API_URL}/tasks/${id}/breakdown`, {
      method: "POST",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async addSubtask(taskId: string, title: string, estimated_time: number | null = null, points: number = 10) {
    const res = await fetch(`${API_URL}/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ title, estimated_time, points }),
    })
    return handleResponse(res)
  },

  async completeSubtask(subtaskId: string) {
    const res = await fetch(`${API_URL}/subtasks/${subtaskId}/complete`, {
      method: "PATCH",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async deleteSubtask(subtaskId: string) {
    const res = await fetch(`${API_URL}/subtasks/${subtaskId}`, {
      method: "DELETE",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  // Rewards
  async getRewards() {
    const res = await fetch(`${API_URL}/rewards`, {
      method: "GET",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async createReward(name: string, description: string = "", cost: number = 100) {
    const res = await fetch(`${API_URL}/rewards`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, description, cost }),
    })
    return handleResponse(res)
  },

  async updateReward(id: string, updates: { name?: string; description?: string; cost?: number }) {
    const res = await fetch(`${API_URL}/rewards/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
    return handleResponse(res)
  },

  async deleteReward(id: string) {
    const res = await fetch(`${API_URL}/rewards/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async analyzeReward(id: string) {
    const res = await fetch(`${API_URL}/rewards/${id}/analyze`, {
      method: "POST",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async claimReward(id: string) {
    const res = await fetch(`${API_URL}/rewards/${id}/claim`, {
      method: "POST",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  // Gamification stats
  async getUserStats() {
    const res = await fetch(`${API_URL}/user/stats`, {
      method: "GET",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getUserProfile() {
    const res = await fetch(`${API_URL}/user/profile`, {
      method: "GET",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },

  async getUserProgress() {
    const res = await fetch(`${API_URL}/user/progress`, {
      method: "GET",
      headers: getHeaders(),
    })
    return handleResponse(res)
  },
}
