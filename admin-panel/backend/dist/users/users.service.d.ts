import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<User>);
    findByUsername(username: string): Promise<User | null>;
    count(): Promise<number>;
    create(params: {
        username: string;
        passwordHash: string;
        role: UserRole;
    }): Promise<User>;
}
