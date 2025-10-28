// Interface for the data fetched from the Open ER API

export interface ExchangeRate {
    result: string;
    documentation: string;
    provider: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    base_code: string;
    rates: {
        [key: string]: number; // e.g., "NGN": 1600.23
    };
}
