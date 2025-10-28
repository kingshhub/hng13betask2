// Service responsible for generating the summary image.

import { Country } from '../entities/Country';
import { Status } from '../entities/Status';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCanvas, registerFont } from 'canvas';
import { InternalServerError, NotFoundError } from '../utils/apiErrors';

const IMAGE_PATH = path.join(process.cwd(), 'cache', 'summary.png');
const CACHE_DIR = path.join(process.cwd(), 'cache');
const WIDTH = 600;
const HEIGHT = 400;

/**
 * Generates and saves the summary image to cache/summary.png.
 * @param countries - Top 5 countries for GDP
 * @param totalCountries - Total count of countries
 * @param lastRefresh - Last refresh timestamp
 */
export const generateSummaryImage = async (
    countries: Country[],
    totalCountries: number,
    lastRefresh: Date
): Promise<void> => {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });

        // Register a fallback font (Canvas requires font files if not on a standard Linux system)
        // Since we cannot include font files, we rely on the default system fonts, but define
        // a standard name for consistency.

        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Border/Shadow
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);

        // Title
        ctx.fillStyle = '#007bff';
        ctx.font = 'bold 30px "sans-serif"';
        ctx.textAlign = 'center';
        ctx.fillText('API Cache Summary', WIDTH / 2, 50);

        // Status Block
        ctx.fillStyle = '#343a40';
        ctx.font = '20px "sans-serif"';
        ctx.textAlign = 'left';

        ctx.fillText(`Total Countries: ${totalCountries}`, 50, 100);
        ctx.fillText(`Last Refresh: ${lastRefresh.toISOString()}`, 50, 130);

        // Top 5 GDP Title
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 24px "sans-serif"';
        ctx.fillText('Top 5 Countries by Estimated GDP (USD)', 50, 180);

        // GDP List
        let y = 210;
        ctx.fillStyle = '#343a40';
        ctx.font = '16px "sans-serif"';

        countries.forEach((country, index) => {
            const gdp = (country.estimated_gdp || 0).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });
            ctx.fillText(
                `${index + 1}. ${country.name}: ${gdp}`,
                60,
                y + index * 30
            );
        });

        // Save to file
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(IMAGE_PATH, buffer);

        console.log(`Summary image saved to ${IMAGE_PATH}`);
    } catch (error) {
        console.error('Error generating summary image:', error);
        throw new InternalServerError('Failed to generate summary image');
    }
};

/**
 * Reads the summary image file buffer.
 */
export const getSummaryImageBuffer = async (): Promise<Buffer> => {
    try {
        await fs.access(IMAGE_PATH);
        return fs.readFile(IMAGE_PATH);
    } catch (e) {
        throw new NotFoundError('Summary image not found');
    }
};
