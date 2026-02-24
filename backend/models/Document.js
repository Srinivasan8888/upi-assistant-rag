import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  source_domain: {
    type: String,
    required: true,
    enum: ['NPCI', 'RBI', 'HDFC', 'SBI', 'ICICI', 'OTHER']
  },
  doc_category: [{
    type: String,
    enum: ['UPI_failure_reasons', 'refund_timelines', 'chargeback_procedure', 'fraud_reporting', 'dispute_resolution']
  }],
  uploaded_at: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'ingested', 'failed'],
    default: 'pending'
  },
  chunk_count: {
    type: Number,
    default: 0
  }
});

export default mongoose.model('Document', documentSchema);
