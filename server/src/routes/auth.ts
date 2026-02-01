import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db'
import { generateToken } from '../middleware/auth'

const router = Router()

// Register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' })
        }

        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' })
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // Insert user
        const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash)
        const userId = result.lastInsertRowid as number

        // Generate token
        const token = generateToken(userId)

        res.status(201).json({ token, userId })
    } catch (error) {
        console.error('Register error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

// Login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        // Find user
        const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email) as { id: number; password_hash: string } | undefined
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash)
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        // Generate token
        const token = generateToken(user.id)

        res.json({ token, userId: user.id })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router
