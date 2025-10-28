// Controller for the /status endpoint

import { Request, Response, NextFunction } from 'express';
import * as countryService from '../services/country.service';

/**
 * GET /status
 * Show total countries and last refresh timestamp
 */
export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = await countryService.getStatus();

        // Convert date to required ISO format
        const response = {
            total_countries: status.total_countries,
            last_refreshed_at: status.last_refreshed_at ? status.last_refreshed_at.toISOString() : null,
        };

        res.status(200).json(response);
    } catch (e) {
        next(e);
    }
};
