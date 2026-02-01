import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { i18n } from './i18n'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(i18n)
app.mount('#app')
