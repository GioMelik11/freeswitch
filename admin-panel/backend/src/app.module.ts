import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { FilesModule } from './files/files.module';
import { FreeswitchModule } from './freeswitch/freeswitch.module';
import { PbxModule } from './pbx/pbx.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    SeedModule,
    FilesModule,
    FreeswitchModule,
    PbxModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
