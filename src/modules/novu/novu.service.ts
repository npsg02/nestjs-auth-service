import { Injectable, OnModuleInit } from '@nestjs/common';
import { Novu } from '@novu/api';

@Injectable()
export class NovuService implements OnModuleInit {
  novu: Novu;

  // constructor() {}

  onModuleInit() {
    this.novu = new Novu({
      secretKey: process.env.NOVU_API_KEY,
      serverURL: process.env.NOVU_API_URL,
    });

    this.novu.trigger({
      to: {
        subscriberId: '682ca4cb27095fedc9eb8c5e',
        email: 'npv2k1@gmail.com',
      },
      workflowId: 'system',
      payload: {},
    });
  }

  async createSubscriber(user: any) {
    const subscriber = await this.novu.subscribers.create({
      // email,
      // firstName: 'John',
      // lastName: 'Doe',
      // subscriberId: '',
      email: user?.email,
      subscriberId: user?.id,
    });

    return subscriber;
  }

  async updateSubscriber(user: any) {
    const subscriber = await this.novu.subscribers.upsert(user?.id, user);

    return subscriber;
  }
}
