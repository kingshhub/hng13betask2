// Interface for the processed country data before saving to DB

export interface ICountry {
    name: string;
    capital: string | null;
    region: string | null;
    population: number;
    currency_code: string | null;
    exchange_rate: number | null;
    estimated_gdp: number | null;
    flag_url: string | null;
    last_refreshed_at: Date;
}

export type SortDirection = 'ASC' | 'DESC';

export interface CountryQueryOptions {
    region?: string;
    currency?: string;
    sortBy?: 'gdp' | 'name' | 'population'; // Only support required ones
    sortDirection: SortDirection;
}
