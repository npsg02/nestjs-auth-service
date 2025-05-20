import { MongodbConfig } from './mongodb.config';
import { MongodbService } from './mongodb.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forRootAsync({ useClass: MongodbConfig })],
  providers: [MongodbService],
})
export class MongodbModule {}
