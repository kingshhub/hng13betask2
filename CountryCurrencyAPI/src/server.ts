// Entry point for the Node.js application.

import 'reflect-metadata'; // Must be imported first for TypeORM
import app from './app';
import env from './config/env';
import { AppDataSource } from './config/orm.config';

const PORT = env.PORT;

const initializeApp = async () => {
    try {
        // Initialize Database Connection
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");

        // Create the 'cache' directory if it doesn't exist
        const fs = require('fs');
        const path = require('path');
        const cacheDir = path.join(process.cwd(), 'cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
            console.log("Created 'cache' directory.");
        }

        // Start Express Server
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error("Error during Data Source initialization or server startup:", err);
        process.exit(1);
    }
};

initializeApp();
