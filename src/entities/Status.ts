import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('status')
export class Status {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    key!: string; // 'last_refreshed_at'

    @Column({ type: 'datetime', nullable: false })
    value!: Date;
}
