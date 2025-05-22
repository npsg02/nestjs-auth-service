import { PlaygroundController } from './playground.controller';
import { PlaygroundService } from './playground.service';
import { RedisdbModule } from '@/shared/database/redisdb/redisdb.module';
import { OpendalModule } from '@/shared/storage/opendal/opendal.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    OpendalModule,
    RedisdbModule,
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get('KAFKA_CLIENT_ID'),
              brokers: configService.get('KAFKA_BROKERS')?.split(',') || [],
              ssl: configService.get('KAFKA_SSL') === 'true',
            },
            consumer: {
              groupId: configService.get<string>('KAFKA_CLIENT_GROUP_ID') || 'default-group',
            },
          },
        }),
      },
    ]),
  ],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
})
export class PlaygroundModule {}
