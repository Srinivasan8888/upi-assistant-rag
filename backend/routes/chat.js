import express from 'express';
import { body, validationResult } from 'express-validator';
import Message from '../models/Message.js';
import { generateResponse } from '../services/rag.js';

const router = express.Router();

// Get chat history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const userEmail = req.query.email;
    const query = { session_id: req.params.sessionId };
    if (userEmail) query.userEmail = userEmail;

    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .limit(50);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/',
  body('session_id').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { session_id, query, file_b64, mime_type, userEmail } = req.body;

      if (!query && !file_b64) {
        return res.status(400).json({ error: "Missing query or file" });
      }

      // Save user message
      const userMessage = await Message.create({
        session_id,
        role: 'user',
        content: query || "Uploaded a file",
        userEmail
      });

      // Get recent history for context
      const recentMessages = await Message.find({ session_id })
        .sort({ timestamp: -1 })
        .limit(5);

      // Generate AI response (you'll implement RAG here)
      const { response, sources } = await generateResponse(query || "", recentMessages, file_b64, mime_type);

      // Save assistant message
      const assistantMessage = await Message.create({
        session_id,
        role: 'assistant',
        content: response,
        sources_used: sources,
        userEmail
      });

      res.json({
        message: assistantMessage,
        sources
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all sessions with titles
router.get('/sessions', async (req, res) => {
  try {
    const userEmail = req.query.email;
    const matchStage = userEmail ? { $match: { userEmail } } : { $match: {} };

    const sessions = await Message.aggregate([
      matchStage,
      {
        $group: {
          _id: '$session_id',
          firstUserMessage: {
            $first: {
              $cond: [
                { $eq: ['$role', 'user'] },
                '$content',
                '$$REMOVE'
              ]
            }
          },
          firstTimestamp: { $min: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          title: {
            $cond: [
              { $ne: ['$firstUserMessage', null] },
              '$firstUserMessage',
              'New Chat'
            ]
          },
          createdAt: '$firstTimestamp'
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userEmail = req.query.email;
    const query = { session_id: sessionId };
    if (userEmail) query.userEmail = userEmail;

    const result = await Message.deleteMany(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Session not found or no messages deleted.' });
    }
    res.json({ message: `Session ${sessionId} and its messages deleted successfully.`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Delete ALL sessions for a user ───────────────────────────────────────────
router.delete('/sessions', async (req, res) => {
  try {
    const userEmail = req.query.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required.' });
    }
    const result = await Message.deleteMany({ userEmail });
    res.json({ message: `All chats deleted for ${userEmail}.`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
