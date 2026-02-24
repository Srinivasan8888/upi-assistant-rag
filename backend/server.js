import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import connectDB from './config/db.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Auto-start Python RAG Server ---
function startRagServer() {
  const ragScript = path.resolve(__dirname, '../AI/api/rag_server.py');

  console.log('🐍 Starting Python RAG server...');
  const ragProcess = spawn('python', [ragScript], {
    stdio: 'pipe',
    detached: false,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
  });

  ragProcess.stdout.on('data', (data) => {
    process.stdout.write(`[RAG] ${data}`);
  });

  ragProcess.stderr.on('data', (data) => {
    // suppress FutureWarning noise, only print real errors
    const msg = data.toString();
    if (!msg.includes('FutureWarning') && !msg.includes('google.generativeai')) {
      process.stderr.write(`[RAG] ${msg}`);
    }
  });

  ragProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[RAG] Python server exited with code ${code}. Restarting in 3s...`);
      setTimeout(startRagServer, 3000);
    }
  });

  // Kill python process if Node exits
  process.on('exit', () => ragProcess.kill());
  process.on('SIGINT', () => { ragProcess.kill(); process.exit(); });
  process.on('SIGTERM', () => { ragProcess.kill(); process.exit(); });
}

startRagServer();

// --- Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UPI Assistant API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Node server running on port ${PORT}`);
  console.log(`⏳ RAG server starting up at http://localhost:8000 (model loading...)`);
});
