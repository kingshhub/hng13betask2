
import { Country } from '../entities/Country';
import * as fs from 'fs/promises';
import * as path from 'path';
import nodeHtmlToImage from 'node-html-to-image';
import { InternalServerError, NotFoundError } from '../utils/apiErrors';

const IMAGE_PATH = path.join(process.cwd(), 'cache', 'summary.png');
const CACHE_DIR = path.join(process.cwd(), 'cache');
const WIDTH = 600;
const HEIGHT = 400;

/**
 * Generates the HTML content for the summary image.
 */
const generateHtmlContent = (
    countries: Country[],
    totalCountries: number,
    lastRefresh: Date
): string => {
    // Format the GDP for display
    const listItems = countries.map((country, index) => {
        // Ensure estimated_gdp is treated as a number for formatting
        const gdpValue = country.estimated_gdp !== undefined && country.estimated_gdp !== null
            ? parseFloat(country.estimated_gdp as any)
            : 0;

        const gdp = gdpValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
        return `
            <li class="list-item">
                <span class="index">${index + 1}.</span>
                <span class="country-name">${country.name}:</span>
                <span class="gdp-value">${gdp}</span>
            </li>
        `;
    }).join('');

    return `
        <html>
        <head>
            <style>
                /* Use Inter or a safe fallback font for wide compatibility */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                
                body {
                    width: ${WIDTH}px;
                    height: ${HEIGHT}px;
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #f8f9fa;
                }
                .container {
                    width: 90%;
                    height: 90%;
                    background-color: #ffffff;
                    border: 4px solid #343a40;
                    border-radius: 12px;
                    padding: 20px;
                    box-sizing: border-box;
                    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                }
                .title {
                    color: #007bff;
                    font-size: 30px;
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .status-info {
                    color: #343a40;
                    font-size: 18px;
                    margin-bottom: 25px;
                    line-height: 1.5;
                    padding-left: 10px;
                }
                .gdp-title {
                    color: #28a745;
                    font-size: 22px;
                    font-weight: 600;
                    margin-top: 15px;
                    margin-bottom: 10px;
                    padding-left: 10px;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 5px;
                }
                .gdp-list {
                    list-style: none;
                    padding-left: 10px;
                    margin: 0;
                    overflow: hidden; /* Prevent potential overflow */
                }
                .list-item {
                    font-size: 16px;
                    color: #343a40;
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: space-between;
                }
                .index {
                    font-weight: 700;
                    margin-right: 5px;
                    min-width: 15px;
                }
                .country-info {
                    display: flex;
                    align-items: baseline;
                }
                .gdp-value {
                    font-weight: 600;
                    color: #007bff;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="title">API Cache Summary</div>
                <div class="status-info">
                    <div>Total Countries: <span style="font-weight: 600;">${totalCountries}</span></div>
                    <div>Last Refresh: <span style="font-weight: 600;">${lastRefresh.toISOString().replace('T', ' ').substring(0, 19)} UTC</span></div>
                </div>
                <div class="gdp-title">Top 5 Countries by Estimated GDP (USD)</div>
                <ul class="gdp-list">
                    ${listItems}
                </ul>
            </div>
        </body>
        </html>
    `;
};


export const generateSummaryImage = async (
    countries: Country[],
    totalCountries: number,
    lastRefresh: Date
): Promise<void> => {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });

        const html = generateHtmlContent(countries, totalCountries, lastRefresh);

        const imageBuffer = await nodeHtmlToImage({
            html: html,
            output: IMAGE_PATH,
            type: 'png',
            encoding: 'binary',
            quality: 100,
            // Adjust viewport to match the desired image size
            puppeteerArgs: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: {
                    width: WIDTH,
                    height: HEIGHT,
                },
            }
        });

        if (!imageBuffer) {
            throw new InternalServerError('node-html-to-image returned an empty buffer.');
        }

        console.log(`Summary image saved to ${IMAGE_PATH}`);
    } catch (error) {
        // Log original error, especially if related to Puppeteer/HTML rendering
        console.error('Error generating summary image:', error);

        // Check for common error during install/runtime of puppeteer
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Failed to set up chrome-headless-shell') ||
            errorMessage.includes('getaddrinfo ENOTFOUND')) {
            // Provide a helpful error message to the user
            throw new InternalServerError(
                'Failed to generate summary image due to Puppeteer dependency issue. ' +
                'Ensure `node-html-to-image` (and its dependency Puppeteer) installed correctly ' +
                'or set PUPPETEER_SKIP_DOWNLOAD environment variable if running in a restricted environment.'
            );
        }

        throw new InternalServerError('Failed to generate summary image.');
    }
};
export const getSummaryImageBuffer = async (): Promise<Buffer> => {
    try {
        await fs.access(IMAGE_PATH);
        return fs.readFile(IMAGE_PATH);
    } catch (e) {

        throw new NotFoundError('Summary image not found');
    }
};
