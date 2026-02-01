import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import todosRoutes from './routes/todos'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration for production
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174']

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/todos', todosRoutes)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📁 Database: ./data/todos.db`)
})
