import 'reflect-metadata';
import app from './app';
import env from './config/env';
import { AppDataSource } from './config/orm.config';

const PORT = process.env.PORT || 3000;


const initializeApp = async () => {
    try {
        // DB Connection
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");
        // create a cache dir
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
