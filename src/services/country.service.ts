import axios from 'axios';
import { AppDataSource } from '../config/orm.config';
import { Country } from '../entities/Country';
import { Status } from '../entities/Status';
import { ICountry, CountryQueryOptions } from '../interfaces/Country';
import { RestCountry } from '../interfaces/RestCountry';
import { ExchangeRate } from '../interfaces/ExchangeRate';
import { ServiceUnavailableError, InternalServerError, NotFoundError, BadRequestError } from '../utils/apiErrors';
import { generateRandomGdpMultiplier } from '../utils/helpers';
import { generateSummaryImage } from './image.service';
import env from '../config/env';
import { FindManyOptions, ILike } from 'typeorm';


const countryRepository = AppDataSource.getRepository(Country);
const statusRepository = AppDataSource.getRepository(Status);

/**
 * 1. Fetches country and exchange data.
 * 2. Processes and calculates estimated GDP.
 * 3. Saves/updates records in a transaction.
 * 4. Generates summary image.
 */
export const refreshCountryCache = async (): Promise<void> => {
    let countries: RestCountry[];
    let exchangeRates: ExchangeRate;
    const refreshTime = new Date();

    // --- Step 1: Fetch External Data with Error Handling ---
    try {
        const countryResponse = await axios.get<RestCountry[]>(env.COUNTRIES_API_URL);
        countries = countryResponse.data;
    } catch (e) {
        throw new ServiceUnavailableError('Rest Countries API');
    }

    try {
        const exchangeResponse = await axios.get<ExchangeRate>(env.EXCHANGE_RATE_API_URL);
        exchangeRates = exchangeResponse.data;
    } catch (e) {
        throw new ServiceUnavailableError('Open ER API');
    }

    // --- Step 2: Processing and Calculation ---
    const processedCountries: ICountry[] = countries.map(country => {
        const currencyCode = country.currencies?.[0]?.code || null;
        let exchangeRate: number | null = null;
        let estimatedGdp: number | null = null;

        if (currencyCode && exchangeRates.rates[currencyCode]) {
            exchangeRate = exchangeRates.rates[currencyCode];
            const multiplier = generateRandomGdpMultiplier();
            // estimated_gdp = population × random(1000–2000) ÷ exchange_rate
            estimatedGdp = (country.population * multiplier) / exchangeRate;
        }

        // Validation Check (required fields): name, population
        if (!country.name || !country.population) {
            console.warn(`Skipping country due to missing required data: ${country.name}`);
            return null;
        }

        return {
            name: country.name,
            capital: country.capital || null,
            region: country.region || null,
            population: country.population,
            currency_code: currencyCode,
            exchange_rate: exchangeRate,
            estimated_gdp: estimatedGdp,
            flag_url: country.flag || null,
            last_refreshed_at: refreshTime,
        } as ICountry;
    }).filter((c): c is ICountry => c !== null);

    // --- Step 3: Database Transaction (Update vs Insert) ---
    await AppDataSource.transaction(async transactionalEntityManager => {
        const existingCountries = await transactionalEntityManager.find(Country, { select: ['name', 'id'] });
        const existingMap = new Map<string, number>();
        existingCountries.forEach(c => existingMap.set(c.name.toLowerCase(), c.id));

        const countriesToSave: Country[] = [];

        for (const processed of processedCountries) {
            const existingId = existingMap.get(processed.name.toLowerCase());

            const countryEntity = new Country();
            Object.assign(countryEntity, processed);

            if (existingId) {
                // Update Logic: Match existing country by name (case-insensitive)
                countryEntity.id = existingId;
                await transactionalEntityManager.save(countryEntity);
            } else {
                // Insert Logic
                countriesToSave.push(countryEntity);
            }
        }

        if (countriesToSave.length > 0) {
            await transactionalEntityManager.insert(Country, countriesToSave);
        }

        // Update Global Status
        const statusRecord = await transactionalEntityManager.findOneBy(Status, { key: 'last_refreshed_at' });
        if (statusRecord) {
            statusRecord.value = refreshTime;
            await transactionalEntityManager.save(statusRecord);
        } else {
            const newStatus = new Status();
            newStatus.key = 'last_refreshed_at';
            newStatus.value = refreshTime;
            await transactionalEntityManager.save(newStatus);
        }
    });

    // --- Step 4: Image Generation ---
    const top5Countries = await countryRepository.find({
        order: { estimated_gdp: 'DESC' },
        take: 5,
    });

    await generateSummaryImage(top5Countries, processedCountries.length, refreshTime);
};

// --- CRUD Operations ---

/**
 * Retrieves all countries with optional filtering and sorting.
 */
export const getAllCountries = async (options: CountryQueryOptions): Promise<Country[]> => {
    const findOptions: FindManyOptions<Country> = {
        where: {},
        order: {},
    };

    if (options.region) {
        // Case-insensitive search
        findOptions.where = { ...findOptions.where, region: ILike(`%${options.region}%`) };
    }

    if (options.currency) {
        findOptions.where = { ...findOptions.where, currency_code: options.currency.toUpperCase() };
    }

    // Sorting logic
    const sortField = options.sortBy === 'gdp' ? 'estimated_gdp' :
        options.sortBy === 'name' ? 'name' :
            options.sortBy === 'population' ? 'population' : null;

    if (sortField) {
        findOptions.order = { [sortField]: options.sortDirection };
    }

    // Sort by name ASC as secondary key for stable sort if a primary sort field is chosen
    if (sortField && sortField !== 'name') {
        findOptions.order = { ...findOptions.order, name: 'ASC' };
    }


    try {
        const countries = await countryRepository.find(findOptions);
        return countries;
    } catch (e) {
        console.error('Database query error:', e);
        throw new InternalServerError('Failed to fetch countries from database.');
    }
};

/**
 * Retrieves a single country by name.
 */
export const getCountryByName = async (name: string): Promise<Country> => {
    const country = await countryRepository.findOne({
        where: { name: ILike(name) },
    });

    if (!country) {
        throw new NotFoundError(`Country '${name}' not found`);
    }

    return country;
};

/**
 * Deletes a single country by name.
 */
export const deleteCountryByName = async (name: string): Promise<void> => {
    const deleteResult = await countryRepository.delete({ name: ILike(name) });

    if (deleteResult.affected === 0) {
        throw new NotFoundError(`Country '${name}' not found`);
    }
};


/**
 * Retrieves the global status (total count and last refresh time).
 */
export const getStatus = async (): Promise<{ total_countries: number; last_refreshed_at: Date | null }> => {
    const total_countries = await countryRepository.count();

    // Retrieve global status timestamp
    const statusRecord = await statusRepository.findOneBy({ key: 'last_refreshed_at' });
    const last_refreshed_at = statusRecord?.value || null;

    return { total_countries, last_refreshed_at };
};
