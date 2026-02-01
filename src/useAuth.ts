import { ref, computed } from 'vue'
import { authApi, getToken, setToken, clearToken } from './api'

const isAuthenticated = ref(!!getToken())
const isLoading = ref(false)
const error = ref<string | null>(null)

export function useAuth() {
    const login = async (email: string, password: string) => {
        isLoading.value = true
        error.value = null
        try {
            const { token } = await authApi.login(email, password)
            setToken(token)
            isAuthenticated.value = true
            return true
        } catch (e) {
            error.value = (e as Error).message
            return false
        } finally {
            isLoading.value = false
        }
    }

    const register = async (email: string, password: string) => {
        isLoading.value = true
        error.value = null
        try {
            const { token } = await authApi.register(email, password)
            setToken(token)
            isAuthenticated.value = true
            return true
        } catch (e) {
            error.value = (e as Error).message
            return false
        } finally {
            isLoading.value = false
        }
    }

    const logout = () => {
        clearToken()
        isAuthenticated.value = false
    }

    const checkAuth = () => {
        isAuthenticated.value = !!getToken()
        return isAuthenticated.value
    }

    return {
        isAuthenticated: computed(() => isAuthenticated.value),
        isLoading: computed(() => isLoading.value),
        error: computed(() => error.value),
        login,
        register,
        logout,
        checkAuth
    }
}
