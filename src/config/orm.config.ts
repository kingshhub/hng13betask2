import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import env from './env';
import { Country } from '../entities/Country';
import { Status } from '../entities/Status';

const caCertPath = path.join(__dirname, '../certs/ca.pem');

const extra: any = {};
try {
    const shouldUseSsl = process.env.DB_SSL === 'true' || fs.existsSync(caCertPath);
    if (shouldUseSsl) {
        const caContent = fs.existsSync(caCertPath) ? fs.readFileSync(caCertPath).toString() : undefined;
        extra.ssl = {
            ca: caContent,
            rejectUnauthorized: true,
        };
    }
} catch (err) {

    console.warn('Warning: unable to load DB CA certificate, proceeding without SSL for DB connection.', err);
}

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: true,
    logging: ['error', 'warn'],
    entities: [Country, Status],
    migrations: [],
    subscribers: [],

    extra: Object.keys(extra).length ? extra : undefined,
});
