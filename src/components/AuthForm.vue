<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../useAuth'

const { t } = useI18n()
const { login, register, isLoading, error } = useAuth()

const emit = defineEmits<{
  (e: 'authenticated'): void
}>()

const isLoginMode = ref(true)
const email = ref('')
const password = ref('')

const handleSubmit = async () => {
  const success = isLoginMode.value 
    ? await login(email.value, password.value)
    : await register(email.value, password.value)
  
  if (success) {
    emit('authenticated')
  }
}

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="hand-drawn-border bg-white/80 p-8 w-full max-w-md">
      <h1 class="text-4xl mb-2 text-center highlighter-effect inline-block w-full">
        {{ isLoginMode ? t('auth.welcomeBack') : t('auth.createAccount') }}
      </h1>
      <p class="font-hand text-lg text-gray-500 text-center mb-8">
        {{ isLoginMode ? t('auth.loginSubtitle') : t('auth.registerSubtitle') }}
      </p>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="font-hand text-lg text-pencil block mb-1">{{ t('auth.email') }}</label>
          <input 
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2 border-b-2 border-pencil focus:outline-none bg-transparent font-hand text-xl"
            :disabled="isLoading"
          />
        </div>

        <div>
          <label class="font-hand text-lg text-pencil block mb-1">{{ t('auth.password') }}</label>
          <input 
            v-model="password"
            type="password"
            required
            minlength="6"
            class="w-full px-4 py-2 border-b-2 border-pencil focus:outline-none bg-transparent font-hand text-xl"
            :disabled="isLoading"
          />
        </div>

        <p v-if="error" class="text-red-500 font-hand text-lg text-center">
          {{ error }}
        </p>

        <button 
          type="submit"
          :disabled="isLoading"
          class="hand-drawn-button bg-accent hover:rotate-1 w-full text-xl"
        >
          {{ isLoading ? '...' : (isLoginMode ? t('auth.login') : t('auth.register')) }}
        </button>
      </form>

      <div class="mt-6 text-center font-hand text-lg">
        <span class="text-gray-500">
          {{ isLoginMode ? t('auth.noAccount') : t('auth.hasAccount') }}
        </span>
        <button 
          @click="toggleMode"
          class="text-pencil underline ml-2 hover:text-accent"
        >
          {{ isLoginMode ? t('auth.register') : t('auth.login') }}
        </button>
      </div>
    </div>
  </div>
</template>
