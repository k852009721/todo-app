// In production, use full backend URL; in development, use Vite proxy
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Token management
export const getToken = (): string | null => {
    return localStorage.getItem('auth_token')
}

export const setToken = (token: string): void => {
    localStorage.setItem('auth_token', token)
}

export const clearToken = (): void => {
    localStorage.removeItem('auth_token')
}

// Auth API
export const authApi = {
    async register(email: string, password: string) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Registration failed')
        return data as { token: string; userId: number }
    },

    async login(email: string, password: string) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Login failed')
        return data as { token: string; userId: number }
    }
}

// Todos API
export interface TodoData {
    id: number
    text: string
    completed: boolean
    dueDate?: string | null
    position?: number
}

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
})

export const todosApi = {
    async getAll(): Promise<TodoData[]> {
        const res = await fetch(`${API_BASE}/todos`, {
            headers: authHeaders()
        })
        if (!res.ok) {
            if (res.status === 401) throw new Error('Unauthorized')
            throw new Error('Failed to fetch todos')
        }
        return res.json()
    },

    async create(text: string, dueDate?: string): Promise<TodoData> {
        const res = await fetch(`${API_BASE}/todos`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ text, dueDate })
        })
        if (!res.ok) throw new Error('Failed to create todo')
        return res.json()
    },

    async update(id: number, updates: Partial<TodoData>): Promise<void> {
        const res = await fetch(`${API_BASE}/todos/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(updates)
        })
        if (!res.ok) throw new Error('Failed to update todo')
    },

    async delete(id: number): Promise<void> {
        const res = await fetch(`${API_BASE}/todos/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        })
        if (!res.ok) throw new Error('Failed to delete todo')
    },

    async reorder(todoIds: number[]): Promise<void> {
        const res = await fetch(`${API_BASE}/todos/reorder`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ todoIds })
        })
        if (!res.ok) throw new Error('Failed to reorder todos')
    }
}
