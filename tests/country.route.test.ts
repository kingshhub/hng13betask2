// Ensure service modules are mocked before importing anything that depends on them
jest.mock('../src/services/country.service');
jest.mock('../src/services/image.service');

import request from 'supertest';
import express from 'express';
import rootRouter from '../src/routes';
import { errorHandler } from '../src/middleware/errorHandler';
import { Country } from '../src/entities/Country';
import * as countryService from '../src/services/country.service';
import * as imageService from '../src/services/image.service';
import { NotFoundError, BadRequestError } from '../src/utils/apiErrors';

// Create a minimal Express app instance for testing
const app = express();
app.use(express.json());
app.use('/', rootRouter);
app.use(errorHandler); // Crucial to test error formatting

// Mock the Service Layer
jest.mock('../src/services/country.service');
jest.mock('../src/services/image.service');
const mockGetAllCountries = countryService.getAllCountries as jest.Mock;
const mockRefreshCache = countryService.refreshCountryCache as jest.Mock;
const mockGetCountryByName = countryService.getCountryByName as jest.Mock;
const mockDeleteCountryByName = countryService.deleteCountryByName as jest.Mock;
const mockGetStatus = countryService.getStatus as jest.Mock;
const mockGetSummaryImageBuffer = imageService.getSummaryImageBuffer as jest.Mock;

describe('Country API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Mock Data
    const mockDate = new Date('2025-10-28T10:00:00.000Z');
    const mockCountry: Country = {
        id: 1,
        name: 'Nigeria',
        capital: 'Abuja',
        region: 'Africa',
        population: 200000000,
        currency_code: 'NGN',
        exchange_rate: 1000,
        estimated_gdp: 300000000000,
        flag_url: 'http://flag.png',
        last_refreshed_at: mockDate,
    } as Country;

    // --- /status Tests ---
    describe('GET /status', () => {
        it('should return 200 with correct status data', async () => {
            mockGetStatus.mockResolvedValue({
                total_countries: 150,
                last_refreshed_at: mockDate,
            });

            const response = await request(app).get('/status');

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                total_countries: 150,
                last_refreshed_at: mockDate.toISOString(), // Check ISO format
            });
        });
    });

    // --- /countries/refresh Tests ---
    describe('POST /countries/refresh', () => {
        it('should return 200 on successful refresh', async () => {
            mockRefreshCache.mockResolvedValue(undefined);

            const response = await request(app).post('/countries/refresh');

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Country cache successfully refreshed and summary image generated.');
            expect(mockRefreshCache).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if refresh service throws an internal error', async () => {
            mockRefreshCache.mockRejectedValue(new Error('DB connection failed'));

            const response = await request(app).post('/countries/refresh');

            expect(response.statusCode).toBe(500);
            expect(response.body.error).toBe('Internal server error');
        });
    });

    // --- /countries/image Tests ---
    describe('GET /countries/image', () => {
        it('should return 200 and image buffer on success', async () => {
            const mockBuffer = Buffer.from('image data');
            mockGetSummaryImageBuffer.mockResolvedValue(mockBuffer);

            const response = await request(app).get('/countries/image');

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toBe('image/png');
            expect(response.body.toString()).toBe('image data');
            expect(mockGetSummaryImageBuffer).toHaveBeenCalledTimes(1);
        });

        it('should return 404 if image is not found (cache miss)', async () => {
            mockGetSummaryImageBuffer.mockRejectedValue(new NotFoundError());

            const response = await request(app).get('/countries/image');

            expect(response.statusCode).toBe(404);
            expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
            expect(response.body.error).toBe('Resource not found');
        });
    });

    // --- GET /countries Tests ---
    describe('GET /countries', () => {
        it('should return 200 with list of countries', async () => {
            mockGetAllCountries.mockResolvedValue([mockCountry]);

            const response = await request(app).get('/countries');

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toBe('Nigeria');
            expect(response.body[0].last_refreshed_at).toBe(mockDate.toISOString());
            expect(mockGetAllCountries).toHaveBeenCalledWith(expect.objectContaining({
                sortBy: 'name',
                sortDirection: 'ASC',
            }));
        });

        it('should pass query params for filtering and sorting', async () => {
            mockGetAllCountries.mockResolvedValue([]);

            await request(app).get('/countries?region=Asia&currency=INR&sort=gdp_desc');

            expect(mockGetAllCountries).toHaveBeenCalledWith({
                region: 'Asia',
                currency: 'INR',
                sortBy: 'gdp',
                sortDirection: 'DESC',
            });
        });

        it('should return 400 for invalid sort parameter', async () => {
            const response = await request(app).get('/countries?sort=invalid_desc');

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Invalid sort field. Only `gdp`, `name`, `population` are supported.');
        });
    });

    // --- GET /countries/:name Tests ---
    describe('GET /countries/:name', () => {
        it('should return 200 with the specific country', async () => {
            mockGetCountryByName.mockResolvedValue(mockCountry);

            const response = await request(app).get('/countries/Nigeria');

            expect(response.statusCode).toBe(200);
            expect(response.body.name).toBe('Nigeria');
            expect(mockGetCountryByName).toHaveBeenCalledWith('Nigeria');
        });

        it('should return 404 if country is not found', async () => {
            mockGetCountryByName.mockRejectedValue(new NotFoundError('Country not found'));

            const response = await request(app).get('/countries/Atlantis');

            expect(response.statusCode).toBe(404);
            expect(response.body.error).toBe('Country not found');
        });
    });

    // --- DELETE /countries/:name Tests ---
    describe('DELETE /countries/:name', () => {
        it('should return 200 on successful deletion', async () => {
            mockDeleteCountryByName.mockResolvedValue(undefined);

            const response = await request(app).delete('/countries/Nigeria');

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe("Country 'Nigeria' successfully deleted.");
            expect(mockDeleteCountryByName).toHaveBeenCalledWith('Nigeria');
        });

        it('should return 404 if country to delete is not found', async () => {
            mockDeleteCountryByName.mockRejectedValue(new NotFoundError('Country not found'));

            const response = await request(app).delete('/countries/Atlantis');

            expect(response.statusCode).toBe(404);
            expect(response.body.error).toBe('Country not found');
        });
    });
});
