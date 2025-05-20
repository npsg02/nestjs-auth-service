import { RedisdbService } from '@/shared/database/redisdb/redisdb.service';
import { OpendalService } from '@/shared/storage/opendal/opendal.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlaygroundService {
  constructor(private readonly opendalService: OpendalService){}

  
}
