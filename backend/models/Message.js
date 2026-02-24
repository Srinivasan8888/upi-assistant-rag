import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sources_used: [String],  // Simple array of source filenames from RAG
  timestamp: {
    type: Date,
    default: Date.now
  },
  userEmail: {
    type: String,
    required: false
  }
});

export default mongoose.model('Message', messageSchema);
