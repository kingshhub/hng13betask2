import * as dotenv from 'dotenv';
import { InternalServerError } from '../utils/apiErrors';

dotenv.config();

const env = {
    PORT: process.env.PORT || 3000,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    COUNTRIES_API_URL: process.env.COUNTRIES_API_URL,
    EXCHANGE_RATE_API_URL: process.env.EXCHANGE_RATE_API_URL,
};

// Simple check for mandatory variables
const requiredVars = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'COUNTRIES_API_URL',
    'EXCHANGE_RATE_API_URL'
];

for (const key of requiredVars) {
    if (!env[key as keyof typeof env]) {
        throw new InternalServerError(`Configuration error: Missing environment variable ${key}`);
    }
}

export default env;
