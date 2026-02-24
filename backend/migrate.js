import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import Message from './models/Message.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upi-assistant';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);

        // The user's requested email id or fallback
        const defaultEmail = 'admin@example.com';

        console.log(`Updating all unassigned messages to belong to: ${defaultEmail}`);
        const result = await Message.updateMany(
            { userEmail: { $exists: false } },
            { $set: { userEmail: defaultEmail } }
        );

        console.log(`Successfully updated ${result.modifiedCount} messages.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
