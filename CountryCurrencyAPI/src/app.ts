// Express application configuration

import express, { Application } from 'express';
import rootRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Middleware
app.use(express.json()); // Body parsing middleware
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', rootRouter);

// Global Error Handler (MUST be last middleware)
app.use(errorHandler);

export default app;
