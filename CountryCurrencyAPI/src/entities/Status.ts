// TypeORM Entity to hold the last global refresh timestamp

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// We use a separate entity to easily track the global status, 
// though the country entity also tracks it per record.
@Entity('status')
export class Status {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    key!: string; // 'last_refreshed_at'

    @Column({ type: 'datetime', nullable: false })
    value!: Date;
}
