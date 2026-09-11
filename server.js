import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

import serviceTypeRoutes from './routes/serviceTypeRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'SafeHome ZA API is running!'
    });
});

// Database test
app.get('/api/test-db', async (req, res) => {

    try {

        const [rows] = await pool.query('SELECT 1 AS result');

        res.json({
            success: true,
            message: 'Database connection successful!',
            data: rows
        });

    } catch (error) {

        console.error('Database connection error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to connect to the database.'
        });
    }
});

// API routes
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/services', serviceRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`SafeHome ZA API is running on port ${PORT}`);
});