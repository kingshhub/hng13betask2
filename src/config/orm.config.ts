import fs from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import env from './env';
import { Country } from '../entities/Country';
import { Status } from '../entities/Status';

const caCertPath = path.join(__dirname, '../certs/ca.pem');

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
    extra: {
        ssl: {
            ca: fs.readFileSync(caCertPath).toString(),
            rejectUnauthorized: true
        }
    }
});
