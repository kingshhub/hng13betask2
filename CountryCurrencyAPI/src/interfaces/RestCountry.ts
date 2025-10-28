// Interface for the data fetched from the Rest Countries API

export interface RestCountryCurrency {
    code: string;
    name: string;
    symbol: string;
}

export interface RestCountry {
    name: string;
    capital?: string;
    region?: string;
    population: number;
    flag: string; // The URL for the flag
    currencies?: RestCountryCurrency[];
}
