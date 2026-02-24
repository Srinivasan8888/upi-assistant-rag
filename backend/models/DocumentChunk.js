import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: false
    },
    text: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number], // Array of floats for the vector
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

export default mongoose.model('DocumentChunk', documentChunkSchema);
