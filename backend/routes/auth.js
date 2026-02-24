import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Synchronize User on Login
router.post('/sync', async (req, res) => {
    try {
        const { email, name, role } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email required" });
        }

        // Upsert the user into the database
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            {
                $set: {
                    name,
                    role: role || 'user',
                    lastLogin: new Date()
                }
            },
            { upsert: true, new: true }
        );

        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
