import { AuthService } from '../auth.service';
import { NovuService } from '@/modules/novu/novu.service';
import { RedisdbService } from '@/shared/database/redisdb/redisdb.service';
import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import * as speakeasy from 'speakeasy';


@Injectable()
export class OtpAuthService {
  private otpTimeout = 60; // seconds

  constructor(
    private readonly novuService: NovuService,
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly redisdbService: RedisdbService
  ) {}

  async generateOtp(identifier: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: identifier },
    });
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    // Generate OTP using speakeasy
    const otp = speakeasy.totp({
      secret: process.env.OTP_SECRET || 'YOUR_SECRET',
      encoding: 'base32',
      step: this.otpTimeout,
    });

    this.redisdbService.set(`otp:${identifier}`, otp, this.otpTimeout);

    await this.novuService.sendOtpEmail(user, otp);
    return otp;
  }

  async verifyOtp(identifier: string, otp: string) {
    const storedOtp = await this.redisdbService.get(`otp:${identifier}`);
    const valid = storedOtp === otp;
    if (!valid) {
      throw new HttpException('Invalid OTP', 400);
    }

    this.redisdbService.del(`otp:${identifier}`);

    return await this.authService.login(
      {
        email: identifier,
        password: otp,
      },
      valid
    );
  }
}