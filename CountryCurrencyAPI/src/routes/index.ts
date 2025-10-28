import { Router } from 'express';
import countryRoutes from './country.routes';
import * as statusController from '../controllers/status.controller';

const router = Router();

// API routes
router.use('/countries', countryRoutes);
router.get('/status', statusController.getStatus);

export default router;
