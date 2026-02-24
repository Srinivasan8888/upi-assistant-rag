import express from 'express';
import multer from 'multer';
import Document from '../models/Document.js';
import { ingestPDF } from '../services/ingest.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// List all documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await Document.find().sort({ uploaded_at: -1 });
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and ingest PDF
router.post('/ingest-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { source_domain, doc_category } = req.body;

    const document = await Document.create({
      filename: req.file.originalname,
      source_domain: source_domain || 'OTHER',
      doc_category: doc_category ? doc_category.split(',') : []
    });

    // Process PDF in background (you'll implement this)
    ingestPDF(req.file.path, document._id);

    res.json({
      message: 'PDF upload started',
      document_id: document._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a document
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // In a real production system, you would also remove the vectors from ChromaDB here.
    // Ensure you delete the actual file from the uploads directory if maintaining clean storage.

    res.json({ message: 'Document deleted successfully', id: doc._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all registered users and their message history
router.get('/users', async (req, res) => {
  try {
    const { default: User } = await import('../models/User.js');

    // We fetch from explicit User collection to get everyone who signed up,
    // and left join the Message collection to get their interaction metrics.
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'messages',
          localField: 'email',
          foreignField: 'userEmail',
          as: 'messages'
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          name: 1,
          role: 1,
          createdAt: 1,
          lastLogin: 1,
          messageCount: { $size: "$messages" },
          // If they have messages use that max timestamp, else fallback to their last login date
          lastActive: {
            $cond: {
              if: { $gt: [{ $size: "$messages" }, 0] },
              then: { $max: "$messages.timestamp" },
              else: "$lastLogin"
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
