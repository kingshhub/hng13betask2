import { AppDataSource } from '../src/config/orm.config';
import { Country } from '../src/entities/Country';
import { Status } from '../src/entities/Status';
import axios from 'axios';
import { ServiceUnavailableError, NotFoundError } from '../src/utils/apiErrors';

// --- Mocks ---
jest.mock('axios');
jest.mock('../src/utils/helpers', () => ({
    generateRandomGdpMultiplier: jest.fn(() => 1500), // Consistent multiplier for testing
}));
// Mock the image service to prevent file system operations during unit tests
jest.mock('../src/services/image.service', () => ({
    generateSummaryImage: jest.fn(),
    getSummaryImageBuffer: jest.fn(),
}));
// Mock TypeORM repositories
const mockCountryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    insert: jest.fn(),
    save: jest.fn(),
};
const mockStatusRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
};
const mockTransaction = jest.fn(async (callback) => {
    const transactionalEntityManager = {
        find: (entity: any, options?: any) => {
            if (entity === Country) return mockCountryRepository.find(options);
            return mockStatusRepository.findOneBy(options);
        },
        findOneBy: (entity: any, args?: any) => {
            if (entity === Status) return mockStatusRepository.findOneBy(args);
            return mockCountryRepository.findOneBy(args);
        },
        save: (record: any) => {
            // If the record has a 'key' field it's a Status record
            if (record && Object.prototype.hasOwnProperty.call(record, 'key')) {
                return mockStatusRepository.save(record);
            }
            return mockCountryRepository.save(record);
        },
        insert: (entity: any, data: any) => {
            return mockCountryRepository.insert(entity, data);
        }
    };

    return callback(transactionalEntityManager as any);
});
jest.spyOn(AppDataSource, 'getRepository').mockImplementation((entity) => {
    if (entity === Country) return mockCountryRepository as any;
    if (entity === Status) return mockStatusRepository as any;
    return {} as any;
});
jest.spyOn(AppDataSource, 'transaction').mockImplementation(mockTransaction);

// Import the service after mocking AppDataSource to ensure repositories are mocked
const countryService = require('../src/services/country.service');

const mockRestCountriesData = [
    {
        name: 'Test Country A',
        capital: 'Capital A',
        region: 'Region 1',
        population: 1000000,
        flag: 'http://flagA.png',
        currencies: [{ code: 'A_CUR', name: 'A Currency', symbol: '$' }],
    },
    {
        name: 'Test Country B',
        capital: 'Capital B',
        region: 'Region 2',
        population: 500000,
        flag: 'http://flagB.png',
        currencies: [{ code: 'B_CUR', name: 'B Currency', symbol: '€' }],
    },
];
// Base USD rate for A_CUR: 1500 * 1,000,000 / 100 = 15,000,000
const mockExchangeRates = {
    rates: {
        'A_CUR': 100, // 1 USD = 100 A_CUR
        'B_CUR': 50,  // 1 USD = 50 B_CUR
    },
};

describe('Country Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- refreshCountryCache Tests ---

    describe('refreshCountryCache', () => {
        it('should successfully fetch, calculate, and save new data', async () => {
            // Setup successful API calls
            (axios.get as jest.Mock)
                .mockResolvedValueOnce({ data: mockRestCountriesData })
                .mockResolvedValueOnce({ data: mockExchangeRates });

            // Mock database state: no existing countries or status
            mockCountryRepository.find.mockResolvedValue([]);
            mockStatusRepository.findOneBy.mockResolvedValue(null);

            await countryService.refreshCountryCache();

            // 1. Check API calls
            expect(axios.get).toHaveBeenCalledTimes(2);

            // 2. Check transaction (update/insert logic)
            expect(AppDataSource.transaction).toHaveBeenCalledTimes(1);

            // 3. Check save/insert logic
            expect(mockCountryRepository.insert).toHaveBeenCalledWith(Country, expect.arrayContaining([
                expect.objectContaining({
                    name: 'Test Country A',
                    estimated_gdp: 15000000, // 1M * 1500 / 100
                }),
                expect.objectContaining({
                    name: 'Test Country B',
                    estimated_gdp: 15000000, // 500k * 1500 / 50 = 15,000,000
                }),
            ]));

            // 4. Check status update (insert for first time)
            expect(mockStatusRepository.save).toHaveBeenCalled();
        });

        it('should throw ServiceUnavailableError if country API fails', async () => {
            (axios.get as jest.Mock).mockRejectedValueOnce(new Error('API Down'));

            await expect(countryService.refreshCountryCache()).rejects.toThrowError('External data source unavailable');
            expect(axios.get).toHaveBeenCalledTimes(1); // Only the first call happened
        });
    });

    // --- getAllCountries Tests ---

    describe('getAllCountries', () => {
        const mockDbCountries = [
            { id: 1, name: 'Nigeria', region: 'Africa', currency_code: 'NGN', estimated_gdp: 1000000000, last_refreshed_at: new Date() } as Country,
            { id: 2, name: 'Ghana', region: 'Africa', currency_code: 'GHS', estimated_gdp: 500000000, last_refreshed_at: new Date() } as Country,
            { id: 3, name: 'Brazil', region: 'Americas', currency_code: 'BRL', estimated_gdp: 2000000000, last_refreshed_at: new Date() } as Country,
        ];

        it('should retrieve all countries with no options', async () => {
            mockCountryRepository.find.mockResolvedValue(mockDbCountries);
            const countries = await countryService.getAllCountries({ sortBy: 'name', sortDirection: 'ASC' });

            expect(countries).toHaveLength(3);
            expect(mockCountryRepository.find).toHaveBeenCalledWith({
                where: {},
                order: { name: 'ASC' },
            });
        });

        it('should filter by region (case-insensitive)', async () => {
            mockCountryRepository.find.mockResolvedValue([mockDbCountries[0], mockDbCountries[1]]);
            await countryService.getAllCountries({ region: 'afRica', sortBy: 'name', sortDirection: 'ASC' });

            expect(mockCountryRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { region: expect.any(Object) }, // ILike implementation detail
                order: { name: 'ASC' }
            }));
            // Verify ILike filter is applied (this relies on the implementation in country.service)
            // In unit tests, we primarily check if the options were passed correctly.
        });

        it('should sort by GDP descending', async () => {
            mockCountryRepository.find.mockResolvedValue(mockDbCountries.reverse()); // Assume DB sorts it
            await countryService.getAllCountries({ sortBy: 'gdp', sortDirection: 'DESC' });

            expect(mockCountryRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                order: { estimated_gdp: 'DESC', name: 'ASC' }
            }));
        });
    });

    // --- getCountryByName Tests ---

    describe('getCountryByName', () => {
        const mockCountry = { id: 1, name: 'Nigeria' } as Country;

        it('should return a country if found', async () => {
            mockCountryRepository.findOne.mockResolvedValue(mockCountry);
            const country = await countryService.getCountryByName('Nigeria');

            expect(country.name).toBe('Nigeria');
            expect(mockCountryRepository.findOne).toHaveBeenCalled();
        });

        it('should throw NotFoundError if country is not found', async () => {
            mockCountryRepository.findOne.mockResolvedValue(null);
            await expect(countryService.getCountryByName('Atlantis')).rejects.toThrowError("Country 'Atlantis' not found");
        });
    });

    // --- deleteCountryByName Tests ---

    describe('deleteCountryByName', () => {
        it('should delete a country if found', async () => {
            mockCountryRepository.delete.mockResolvedValue({ affected: 1 });
            await expect(countryService.deleteCountryByName('Nigeria')).resolves.toBeUndefined();

            expect(mockCountryRepository.delete).toHaveBeenCalled();
        });

        it('should throw NotFoundError if country is not found', async () => {
            mockCountryRepository.delete.mockResolvedValue({ affected: 0 });
            await expect(countryService.deleteCountryByName('Atlantis')).rejects.toThrowError("Country 'Atlantis' not found");
        });
    });

    // --- getStatus Tests ---

    describe('getStatus', () => {
        it('should return total count and last refresh time', async () => {
            const mockDate = new Date();
            mockCountryRepository.count.mockResolvedValue(150);
            mockStatusRepository.findOneBy.mockResolvedValue({ value: mockDate } as Status);

            const status = await countryService.getStatus();

            expect(status.total_countries).toBe(150);
            expect(status.last_refreshed_at).toEqual(mockDate);
        });

        it('should return null date if status record is missing', async () => {
            mockCountryRepository.count.mockResolvedValue(0);
            mockStatusRepository.findOneBy.mockResolvedValue(null);

            const status = await countryService.getStatus();

            expect(status.total_countries).toBe(0);
            expect(status.last_refreshed_at).toBeNull();
        });
    });
});
