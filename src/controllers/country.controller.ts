import { Request, Response, NextFunction } from 'express';
import * as countryService from '../services/country.service';
import * as imageService from '../services/image.service';
import { BadRequestError, NotFoundError } from '../utils/apiErrors';
import { SortDirection } from '../interfaces/Country';


export const refreshCache = async (req: Request, res: Response, next: NextFunction) => {
    // Set a timeout for the entire operation
    const timeoutMs = 25000; // 25 seconds
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    );

    try {
        // Race between the refresh operation and timeout
        await Promise.race([
            countryService.refreshCountryCache(),
            timeoutPromise
        ]);

        res.status(200).json({ message: 'Country cache successfully refreshed and summary image generated.' });
    } catch (e) {
        if (e instanceof Error && e.message === 'Operation timed out') {
            res.status(504).json({ error: 'Request timed out while refreshing cache' });
            return;
        }
        next(e);
    }
};


export const getCountries = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { region, currency, sort } = req.query;

        let sortBy: 'gdp' | 'name' | 'population' = 'name';
        let sortDirection: SortDirection = 'ASC';

        if (typeof sort === 'string') {
            const parts = sort.split('_');
            const field = parts[0].toLowerCase();
            const direction = parts[1]?.toUpperCase() || 'ASC';

            if (field === 'gdp') {
                sortBy = 'gdp';
            } else if (field === 'name') {
                sortBy = 'name';
            } else if (field === 'population') {
                sortBy = 'population';
            } else {
                throw new BadRequestError('Invalid sort field. Only `gdp`, `name`, `population` are supported.');
            }

            if (direction !== 'ASC' && direction !== 'DESC') {
                throw new BadRequestError('Invalid sort direction. Use `asc` or `desc`.');
            }
            sortDirection = direction as SortDirection;
        }

        const countries = await countryService.getAllCountries({
            region: region as string | undefined,
            currency: currency as string | undefined,
            sortBy,
            sortDirection,
        });

        // Map to ensure ISO format for date
        const response = countries.map(c => ({
            ...c,
            last_refreshed_at: c.last_refreshed_at.toISOString(),
            estimated_gdp: parseFloat(c.estimated_gdp as any)
        }));

        res.status(200).json(response);
    } catch (e) {
        next(e);
    }
};

export const getCountryByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name = req.params.name;
        if (!name) {
            throw new BadRequestError('Country name parameter is required.');
        }

        const country = await countryService.getCountryByName(name);

        const response = {
            ...country,
            last_refreshed_at: country.last_refreshed_at.toISOString(),
            estimated_gdp: parseFloat(country.estimated_gdp as any)
        };

        res.status(200).json(response);
    } catch (e) {
        next(e);
    }
};

/**
 * DELETE /countries/:name
 * Delete a country record.
 */
export const deleteCountryByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name = req.params.name;
        if (!name) {
            throw new BadRequestError('Country name parameter is required.');
        }

        await countryService.deleteCountryByName(name);
        res.status(200).json({ message: `Country '${name}' successfully deleted.` });
    } catch (e) {
        next(e);
    }
};

/**
 * GET /countries/image
 * Serve the generated summary image.
 */
export const getSummaryImage = async (req: Request, res: Response, next: NextFunction) => {
    const timeoutMs = 10000; // 10 seconds timeout
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    );

    try {
        const imageBuffer = await Promise.race([
            imageService.getSummaryImageBuffer(),
            timeoutPromise
        ]);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        res.send(imageBuffer);
    } catch (e) {
        if (e instanceof Error && e.message === 'Operation timed out') {
            return res.status(504).json({ error: 'Request timed out while generating image' });
        }
        // NotFoundError from imageService returns a 404 with JSON error
        if (e instanceof NotFoundError) {
            return res.status(404).json({ error: 'Summary image not found' });
        }
        next(e);
    }
};
