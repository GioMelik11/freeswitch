import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbPath = config.get<string>('DB_PATH') ?? 'data/admin.sqlite';
        const dir = path.dirname(dbPath);
        if (dir && dir !== '.' && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        return {
          type: 'sqlite',
          database: dbPath,
          entities: [User],
          synchronize: true,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
