import { Portfolio, PortfolioSchema } from './models/portfolio.model';
import { StockPriceModel, StockPriceSchema } from './models/stock-price.model';
import { MongodbConfig } from './mongodb.config';
import { MongodbService } from './mongodb.service';
import { PortfolioRepository } from './repositories/portfolio.repository';
import { StockPriceRepository } from './repositories/stock-price.repository';
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({ useClass: MongodbConfig }),
    MongooseModule.forFeature([
      {
        name: StockPriceModel.name,
        schema: StockPriceSchema,
      },
      {
        name: Portfolio.name,
        schema: PortfolioSchema,
      },
    ]),
  ],
  providers: [MongodbService, StockPriceRepository, PortfolioRepository],
  exports: [MongodbService, StockPriceRepository, PortfolioRepository],
})
export class MongodbModule {}
