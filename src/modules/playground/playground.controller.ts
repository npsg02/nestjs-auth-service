import { PlaygroundService } from './playground.service';
import { RedisdbService } from '@/shared/database/redisdb/redisdb.service';
import { OpendalService } from '@/shared/storage/opendal/opendal.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Playground')
@Controller('playground')
export class PlaygroundController {
  constructor(
    private readonly playgroundService: PlaygroundService,
    private readonly opendalService: OpendalService,
    private readonly redisdbService: RedisdbService
  ) {}

  @Get('test-storage')
  async testStorage() {
    this.opendalService.test();
  }

  @Get('redis')
  async testRedis() {
    this.opendalService.redis();
  }
}
