<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import type { SupportedLocale } from './i18n'
import { useAuth } from './useAuth'
import { todosApi } from './api'
import AuthForm from './components/AuthForm.vue'

const { t, locale } = useI18n()
const { isAuthenticated, logout, checkAuth } = useAuth()

// Language Switcher
const languages: { code: SupportedLocale; label: string }[] = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' }
]

watch(locale, (newLocale) => {
  localStorage.setItem('locale', newLocale)
})

// SEO Metadata
useHead({
  title: 'Hand-Drawn Todo List',
  meta: [
    { name: 'description', content: 'A visually unique, hand-drawn style Todo List application with filters, groupings, and full editing support.' },
    { property: 'og:title', content: 'Advanced Hand-Drawn Todo List' },
    { property: 'og:description', content: 'Organize your day with precision and style.' },
    { property: 'og:image', content: '/og-image.png' },
  ],
})

interface Todo {
  id: number
  text: string
  completed: boolean
  dueDate?: string
}

type FilterStatus = 'all' | 'active' | 'completed'

const newTodo = ref('')
const newTodoDate = ref('')
const todos = ref<Todo[]>([])
const currentFilter = ref<FilterStatus>('all')
const isLoading = ref(false)
const isComposing = ref(false) // For IME input handling

// Editing State
const editingId = ref<number | null>(null)
const editingText = ref('')
const editingDate = ref('')
const editInputRef = ref<HTMLInputElement | HTMLInputElement[] | null>(null)

// Load todos from API
const loadTodos = async (force = false) => {
  // Skip auth check if forced (e.g., right after login)
  if (!force && !isAuthenticated.value) return
  isLoading.value = true
  try {
    const data = await todosApi.getAll()
    todos.value = data.map(t => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      dueDate: t.dueDate || undefined
    }))
  } catch (error) {
    console.error('Failed to load todos:', error)
    // If unauthorized, logout
    if ((error as Error).message === 'Unauthorized') {
      logout()
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  checkAuth()
  if (isAuthenticated.value) {
    loadTodos()
  }
})

// Watch for authentication state changes (handles login)
watch(isAuthenticated, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // User just logged in, load their todos
    loadTodos(true)
  }
})

const onAuthenticated = () => {
  // This is now a backup - the watch should handle it
  loadTodos(true)
}

const handleLogout = () => {
  logout()
  todos.value = []
}

const addTodo = async () => {
  // Don't add if still composing (IME input)
  if (isComposing.value) return
  if (!newTodo.value.trim()) return
  try {
    const created = await todosApi.create(newTodo.value, newTodoDate.value || undefined)
    todos.value.push({
      id: created.id,
      text: created.text,
      completed: created.completed,
      dueDate: created.dueDate || undefined
    })
    newTodo.value = ''
    newTodoDate.value = ''
    sortTodos()
  } catch (error) {
    console.error('Failed to add todo:', error)
  }
}

const toggleTodo = async (id: number) => {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    const newCompleted = !todo.completed
    try {
      await todosApi.update(id, { completed: newCompleted })
      todo.completed = newCompleted
    } catch (error) {
      console.error('Failed to toggle todo:', error)
    }
  }
}

const removeTodo = async (id: number) => {
  try {
    await todosApi.delete(id)
    todos.value = todos.value.filter(t => t.id !== id)
  } catch (error) {
    console.error('Failed to delete todo:', error)
  }
}

// Edit Actions
const startEdit = (todo: Todo) => {
  editingId.value = todo.id
  editingText.value = todo.text
  editingDate.value = todo.dueDate || ''
  nextTick(() => {
    const el = Array.isArray(editInputRef.value) ? editInputRef.value[0] : editInputRef.value
    el?.focus()
  })
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async () => {
  if (editingId.value === null) return
  const todo = todos.value.find(t => t.id === editingId.value)
  if (todo) {
    try {
      await todosApi.update(editingId.value, {
        text: editingText.value,
        dueDate: editingDate.value || undefined
      })
      todo.text = editingText.value
      todo.dueDate = editingDate.value || undefined
      sortTodos()
    } catch (error) {
      console.error('Failed to save edit:', error)
    }
  }
  editingId.value = null
}

const sortTodos = () => {
  todos.value.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      const diff = a.dueDate.localeCompare(b.dueDate)
      if (diff !== 0) return diff
      return a.id - b.id
    }
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return a.id - b.id
  })
}

const onDragEnd = async () => {
  const todoIds = todos.value.map(t => t.id)
  try {
    await todosApi.reorder(todoIds)
  } catch (error) {
    console.error('Failed to reorder:', error)
  }
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const isToday = (dateStr?: string) => {
  if (!dateStr) return false
  const iso = new Date().toISOString().split('T')[0]
  return iso ? dateStr.startsWith(iso) : false
}

const isUpcoming = (dateStr?: string) => {
  if (!dateStr) return false
  const isoParts = new Date().toISOString().split('T')
  const today = isoParts[0]
  const target = dateStr.split('T')[0]
  if (!today || !target) return false
  return target > today
}

const isPastDue = (dateStr?: string) => {
  if (!dateStr) return false
  const isoParts = new Date().toISOString().split('T')
  const today = isoParts[0]
  const target = dateStr.split('T')[0]
  if (!today || !target) return false
  return target < today
}

const filteredTodos = computed(() => {
  if (currentFilter.value === 'active') return todos.value.filter(t => !t.completed)
  if (currentFilter.value === 'completed') return todos.value.filter(t => t.completed)
  return todos.value
})

const groupedTodos = computed(() => {
  const groups = [
    { key: 'today', items: filteredTodos.value.filter(t => isToday(t.dueDate)) },
    { key: 'upcoming', items: filteredTodos.value.filter(t => isUpcoming(t.dueDate)) },
    { key: 'someday', items: filteredTodos.value.filter(t => !t.dueDate) },
    { key: 'pastDue', items: filteredTodos.value.filter(t => isPastDue(t.dueDate)) }
  ]
  return groups.filter(g => g.items.length > 0)
})
</script>

<template>
  <!-- Auth Form (when not logged in) -->
  <AuthForm v-if="!isAuthenticated" @authenticated="onAuthenticated" />
  
  <!-- Main App (when logged in) -->
  <div v-else class="min-h-screen p-8 sm:p-20 flex flex-col items-center">
    <header class="mb-12 text-center w-full">
      <!-- Language Switcher & Logout (responsive positioning) -->
      <div class="flex justify-end items-center gap-4 mb-4 sm:mb-0 sm:absolute sm:right-0 sm:top-0 relative">
        <select 
          v-model="locale"
          class="bg-transparent font-hand text-lg border border-pencil rounded px-2 py-1 cursor-pointer focus:outline-none hover:bg-white/50 transition-colors"
        >
          <option v-for="lang in languages" :key="lang.code" :value="lang.code">
            {{ lang.label }}
          </option>
        </select>
        <button 
          @click="handleLogout"
          class="font-hand text-lg text-gray-500 hover:text-pencil transition-colors"
        >
          {{ t('auth.logout') }}
        </button>
      </div>
      <h1 class="text-5xl sm:text-7xl mb-4 highlighter-effect">{{ t('app.title') }}</h1>
      <p class="font-hand text-xl text-gray-600">{{ t('app.subtitle') }}</p>
    </header>

    <main class="w-full max-w-2xl">
      <!-- Loading indicator -->
      <div v-if="isLoading" class="text-center font-hand text-2xl text-gray-400 mb-8">
        Loading...
      </div>

      <!-- Input Section -->
      <div class="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center p-6 hand-drawn-border bg-white/50">
        <div class="flex-1 w-full space-y-2">
          <input 
            v-model="newTodo"
            @keydown.enter="addTodo"
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
            :placeholder="t('input.placeholder')"
            class="w-full px-4 py-2 border-b-2 border-pencil focus:outline-none bg-transparent font-hand text-2xl"
          />
          <div class="flex items-center gap-2 text-gray-500">
            <span class="font-hand text-lg">{{ t('input.due') }}</span>
            <input 
              v-model="newTodoDate"
              type="datetime-local"
              class="bg-transparent font-hand text-lg focus:outline-none cursor-pointer"
            />
          </div>
        </div>
        <button 
          @click="addTodo"
          class="hand-drawn-button bg-accent hover:rotate-2 w-full sm:w-auto text-xl"
        >
          {{ t('input.addButton') }}
        </button>
      </div>

      <!-- Filters Section -->
      <div class="flex justify-center gap-4 mb-10 font-hand text-xl">
        <button 
          v-for="status in (['all', 'active', 'completed'] as FilterStatus[])"
          :key="status"
          @click="currentFilter = status"
          class="px-4 py-1 transition-all rounded"
          :class="currentFilter === status ? 'highlighter-effect text-pencil' : 'text-gray-400 hover:text-pencil'"
        >
          {{ t(`filter.${status}`) }}
        </button>
      </div>

      <!-- Grouped List Section -->
      <div v-for="group in groupedTodos" :key="group.key" class="mb-12">
        <h2 class="text-3xl mb-6 inline-block highlighter-effect px-2 -rotate-1">
          {{ t(`groups.${group.key}`) }}
        </h2>
        
        <draggable 
          v-model="todos" 
          item-key="id" 
          class="space-y-4"
          handle=".drag-handle"
          ghost-class="ghost-item"
          @end="onDragEnd"
        >
          <template #item="{ element: todo }">
            <li 
              v-if="group.items.some(item => item.id === todo.id)"
              class="flex items-center gap-4 p-4 hand-drawn-border bg-white transition-all group relative"
              :class="{ 'opacity-60 bg-gray-50': todo.completed, 'ring-2 ring-accent scale-[1.02]': editingId === todo.id, 'hover:-translate-y-1': editingId !== todo.id }"
            >
              <!-- Drag Handle -->
              <div v-if="editingId !== todo.id" class="drag-handle cursor-grab active:cursor-grabbing text-gray-200 hover:text-pencil font-hand text-xl px-1 select-none">
                ⠿
              </div>

              <!-- Content Area -->
              <div class="flex-1 flex gap-4 items-center min-w-0">
                <button 
                  v-if="editingId !== todo.id"
                  @click="toggleTodo(todo.id)"
                  class="w-6 h-6 hand-drawn-border flex items-center justify-center shrink-0"
                  :class="{ 'bg-highlighter': todo.completed }"
                >
                  <span v-if="todo.completed" class="text-white text-xs">✓</span>
                </button>
                
                <div v-if="editingId === todo.id" class="flex-1 space-y-2">
                  <input 
                    ref="editInputRef"
                    v-model="editingText"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                    class="w-full px-2 py-1 border-b border-pencil focus:outline-none bg-transparent font-hand text-2xl"
                  />
                  <input 
                    v-model="editingDate"
                    type="datetime-local"
                    class="bg-transparent font-hand text-sm focus:outline-none cursor-pointer text-gray-500"
                  />
                </div>
                <div v-else class="flex-1 min-w-0 pointer-events-none">
                  <span 
                    class="block font-hand text-2xl truncate"
                    :class="{ 'line-through decoration-highlighter decoration-2 text-gray-400': todo.completed }"
                  >
                    {{ todo.text }}
                  </span>
                  <span v-if="todo.dueDate" class="text-sm font-hand text-gray-400">
                    🗓️ {{ formatDateTime(todo.dueDate) }}
                  </span>
                </div>
              </div>

              <!-- Actions Area -->
              <div class="flex items-center gap-2">
                <template v-if="editingId === todo.id">
                  <button @click="saveEdit" class="text-green-500 font-hand text-xl px-2 hover:scale-110">💾</button>
                  <button @click="cancelEdit" class="text-gray-400 font-hand text-xl px-2 hover:scale-110">✕</button>
                </template>
                <template v-else>
                  <button 
                    @click="startEdit(todo)"
                    class="text-pencil opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity font-hand text-xl px-2 hover:scale-110"
                  >
                    ✎
                  </button>
                  <button 
                    @click="removeTodo(todo.id)"
                    class="text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity font-hand text-xl px-2 hover:scale-110"
                  >
                    ✕
                  </button>
                </template>
              </div>
            </li>
          </template>
        </draggable>
      </div>

      <p v-if="todos.length === 0 && !isLoading" class="text-center font-hand text-gray-400 mt-12 text-3xl rotate-2">
        {{ t('app.empty') }}
      </p>
      <p v-else-if="filteredTodos.length === 0" class="text-center font-hand text-gray-400 mt-12 text-2xl">
        {{ t('app.noFiltered', { filter: t(`filter.${currentFilter}`) }) }}
      </p>
    </main>
  </div>
</template>

<style scoped>
.ghost-item {
  @apply opacity-30 border-dashed scale-95;
  transform: rotate(-1.5deg);
}

/* Custom styling for date input */
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.5);
}
</style>
