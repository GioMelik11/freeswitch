import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
export declare class SeedService implements OnModuleInit {
    private readonly users;
    private readonly config;
    private readonly logger;
    constructor(users: UsersService, config: ConfigService);
    onModuleInit(): Promise<void>;
}
