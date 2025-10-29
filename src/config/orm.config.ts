import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import env from './env';
import { Country } from '../entities/Country';
import { Status } from '../entities/Status';

const caCertPath = path.join(__dirname, '../certs/ca.pem');

// Build 'extra' config only when a CA cert is available or SSL is explicitly requested
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
    // Do not crash the application if cert reading fails; log and continue without SSL.
    // In production you'd want to surface this to observability/alerts.
    // Keep behavior non-invasive so missing certs don't crash the app.
    // eslint-disable-next-line no-console
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
    // Attach extra only if it contains SSL settings (keeps local/dev simple)
    extra: Object.keys(extra).length ? extra : undefined,
});
