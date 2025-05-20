import { PlaygroundController } from './playground.controller';
import { PlaygroundService } from './playground.service';
import { RedisdbModule } from '@/shared/database/redisdb/redisdb.module';
import { OpendalModule } from '@/shared/storage/opendal/opendal.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [OpendalModule, RedisdbModule],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
})
export class PlaygroundModule {}
