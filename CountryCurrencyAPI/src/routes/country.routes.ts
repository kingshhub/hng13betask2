// Router for all /countries routes

import { Router } from 'express';
import * as countryController from '../controllers/country.controller';

const router = Router();

router.post('/refresh', countryController.refreshCache);
router.get('/image', countryController.getSummaryImage);
router.get('/', countryController.getCountries);
router.get('/:name', countryController.getCountryByName);
router.delete('/:name', countryController.deleteCountryByName);

export default router;
