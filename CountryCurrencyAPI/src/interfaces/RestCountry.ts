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
    flag: string;
    currencies?: RestCountryCurrency[];
}
