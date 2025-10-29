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

export const refreshCountryCache = async (): Promise<void> => {
    let countries: RestCountry[];
    let exchangeRates: ExchangeRate;
    const refreshTime = new Date();

    // Create abort controller for timeouts
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 250000);

    try {
        const countryResponse = await axios.get<RestCountry[]>(env.COUNTRIES_API_URL, {
            signal: controller.signal,
            timeout: 200000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'HNG-Task/1.0'
            }
        });
        countries = countryResponse.data;

        if (!Array.isArray(countries) || countries.length === 0) {
            throw new Error('Invalid response from Countries API');
        }
    } catch (e) {
        console.error('Rest Countries API error:', e);
        throw new ServiceUnavailableError('Could not fetch data from Rest Countries API');
    }

    try {
        const exchangeResponse = await axios.get<ExchangeRate>(env.EXCHANGE_RATE_API_URL, {
            timeout: 200000,
            headers: { 'Accept': 'application/json' }
        });
        exchangeRates = exchangeResponse.data;
    } catch (e) {
        console.error('Exchange Rate API error:', e);
        throw new ServiceUnavailableError('Open ER API');
    }

    const processedCountries: ICountry[] = countries.map(country => {
        // Basic validation first
        if (!country.name || !country.population) {
            console.warn(`Skipping country due to missing required fields: ${country.name || 'unknown'}`);
            return null;
        }

        // Get first currency code or null if no currencies
        const currencyCode = country.currencies && country.currencies.length > 0 ?
            country.currencies[0].code : null;
        let exchangeRate: number | null = null;
        let estimatedGdp: number | null = null;

        // Handle exchange rate and GDP calculation
        if (currencyCode && exchangeRates.rates[currencyCode]) {
            exchangeRate = exchangeRates.rates[currencyCode];
            const multiplier = generateRandomGdpMultiplier(); // Random between 1000-2000
            estimatedGdp = (country.population * multiplier) / exchangeRate;
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

    // Database Transaction (Update vs Insert) ---
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
        // If sorting by GDP and no direction specified, default to DESC
        if (sortField === 'estimated_gdp' && !options.sortDirection) {
            findOptions.order = { [sortField]: 'DESC' };
        } else {
            findOptions.order = { [sortField]: options.sortDirection };
        }
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


export const getCountryByName = async (name: string): Promise<Country> => {
    const country = await countryRepository.findOne({
        where: { name: ILike(name) },
    });

    if (!country) {
        throw new NotFoundError(`Country '${name}' not found`);
    }

    return country;
};

export const deleteCountryByName = async (name: string): Promise<void> => {
    // First check if country exists to provide accurate 404
    const country = await countryRepository.findOne({
        where: { name: ILike(name) },
        select: ['id']
    });

    if (!country) {
        throw new NotFoundError(`Country '${name}' not found`);
    }

    await countryRepository.delete(country.id);
};


export const getStatus = async (): Promise<{ total_countries: number; last_refreshed_at: Date | null }> => {
    const total_countries = await countryRepository.count();

    // Retrieve global status timestamp
    const statusRecord = await statusRepository.findOneBy({ key: 'last_refreshed_at' });
    const last_refreshed_at = statusRecord?.value || null;

    return { total_countries, last_refreshed_at };
};
