import { PlaygroundService } from './playground.service';
import { RedisdbService } from '@/shared/database/redisdb/redisdb.service';
import { OpendalService } from '@/shared/storage/opendal/opendal.service';
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Playground')
@Controller('playground')
export class PlaygroundController {
  constructor(
    private readonly playgroundService: PlaygroundService,
    private readonly opendalService: OpendalService,
    private readonly redisdbService: RedisdbService,
    @Inject('KAFKA_CLIENT') private readonly client: ClientKafka
  ) {}

  @Get('test-storage')
  async testStorage() {
    this.opendalService.test();
  }

  @Get('redis')
  async testRedis() {
    this.opendalService.redis();
  }

  @MessagePattern('ping')
  async handlePing(body) {
    console.log('body', body);
    return 'pong';
  }
  

  @Get('ping-kafka')
  async testMicroservice() {
    this.client.emit('ping', {
      data: new Date(),
    });
    return 'ok';
  }
}
