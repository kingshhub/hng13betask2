// TypeORM Entity defining the MySQL table for Country data

import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('countries')
export class Country {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true, nullable: false, collation: 'utf8mb4_bin' })
    name!: string;

    @Column({ nullable: true })
    capital?: string;

    @Column({ nullable: true })
    region?: string;

    @Column({ type: 'bigint', nullable: false })
    population!: number;

    @Column({ type: 'varchar', length: 10, nullable: true })
    currency_code?: string;

    @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
    exchange_rate?: number;

    // computed from population * random(1000–2000) / exchange_rate
    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    estimated_gdp?: number;

    @Column({ type: 'varchar', length: 512, nullable: true })
    flag_url?: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', nullable: false })
    last_refreshed_at!: Date;
}
