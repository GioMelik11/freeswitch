import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private readonly users: UsersService,
        private readonly config: ConfigService,
    ) { }

    async onModuleInit() {
        const count = await this.users.count();
        if (count > 0) return;

        const username = this.config.get<string>('ADMIN_DEFAULT_USERNAME') ?? 'admin';
        const password = this.config.get<string>('ADMIN_DEFAULT_PASSWORD') ?? 'admin1234';

        const passwordHash = await bcrypt.hash(password, 10);
        await this.users.create({ username, passwordHash, role: 'admin' });

        this.logger.warn(
            `Seeded initial admin user: username="${username}". Change the password immediately.`,
        );
    }
}


