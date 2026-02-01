import { Router, Response } from 'express'
import db from '../db'
import { AuthRequest, authMiddleware } from '../middleware/auth'

const router = Router()

// All todo routes require authentication
router.use(authMiddleware)

interface Todo {
    id: number
    user_id: number
    text: string
    completed: number
    due_date: string | null
    position: number
    created_at: string
    updated_at: string
}

// Get all todos for user
router.get('/', (req: AuthRequest, res: Response) => {
    try {
        const todos = db.prepare(`
      SELECT id, text, completed, due_date as dueDate, position 
      FROM todos 
      WHERE user_id = ? 
      ORDER BY position ASC, due_date ASC NULLS LAST
    `).all(req.userId) as Todo[]

        // Convert completed from 0/1 to boolean
        const formattedTodos = todos.map(t => ({
            ...t,
            completed: Boolean(t.completed)
        }))

        res.json(formattedTodos)
    } catch (error) {
        console.error('Get todos error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

// Create todo
router.post('/', (req: AuthRequest, res: Response) => {
    try {
        const { text, dueDate } = req.body

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text is required' })
        }

        // Get max position
        const maxPos = db.prepare('SELECT MAX(position) as maxPos FROM todos WHERE user_id = ?').get(req.userId) as { maxPos: number | null }
        const position = (maxPos.maxPos || 0) + 1

        const result = db.prepare(`
      INSERT INTO todos (user_id, text, due_date, position) 
      VALUES (?, ?, ?, ?)
    `).run(req.userId, text.trim(), dueDate || null, position)

        const newTodo = {
            id: result.lastInsertRowid as number,
            text: text.trim(),
            completed: false,
            dueDate: dueDate || null,
            position
        }

        res.status(201).json(newTodo)
    } catch (error) {
        console.error('Create todo error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

// Update todo
router.put('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params
        const { text, completed, dueDate } = req.body

        // Check ownership
        const existing = db.prepare('SELECT id FROM todos WHERE id = ? AND user_id = ?').get(id, req.userId)
        if (!existing) {
            return res.status(404).json({ error: 'Todo not found' })
        }

        db.prepare(`
      UPDATE todos 
      SET text = COALESCE(?, text),
          completed = COALESCE(?, completed),
          due_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
            text?.trim() || null,
            completed !== undefined ? (completed ? 1 : 0) : null,
            dueDate,
            id,
            req.userId
        )

        res.json({ success: true })
    } catch (error) {
        console.error('Update todo error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

// Delete todo
router.delete('/:id', (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params

        const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, req.userId)

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Todo not found' })
        }

        res.json({ success: true })
    } catch (error) {
        console.error('Delete todo error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

// Reorder todos
router.put('/reorder', (req: AuthRequest, res: Response) => {
    try {
        const { todoIds } = req.body as { todoIds: number[] }

        if (!Array.isArray(todoIds)) {
            return res.status(400).json({ error: 'todoIds array is required' })
        }

        const updateStmt = db.prepare('UPDATE todos SET position = ? WHERE id = ? AND user_id = ?')

        const updateMany = db.transaction((ids: number[]) => {
            ids.forEach((id, index) => {
                updateStmt.run(index, id, req.userId)
            })
        })

        updateMany(todoIds)

        res.json({ success: true })
    } catch (error) {
        console.error('Reorder error:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router
