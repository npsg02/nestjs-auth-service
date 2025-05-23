import { NovuService } from '../novu/novu.service';
import { LoginRequestDto } from './dto/request/login-request.dto';
import { ChangePasswordInput } from './dto/request/reset-password.input';
import { Token } from './entities/Token';
import { PasswordService } from './services/password.service';
import { SecurityConfig } from '@/common/configs/config.interface';
import { User } from '@/modules/user/entities/User';
import { UsersService } from '@/modules/user/users.service';
import { Prisma, PrismaService, UserRole } from '@/shared/prisma';
import { generateRandomPassword } from '@/utils/tool';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type UserPayload = {
  userId: string;
  role: string[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly novuService: NovuService
  ) {}

  /**
   * This function creates a new user with a hashed password and a user role, and generates tokens for
   * the user.
   * @param payload - The payload parameter is an object of type Prisma.UserCreateInput, which contains
   * the data needed to create a new user in the database. It includes properties such as email,
   * password, firstName, lastName, and any other relevant user information.
   * @returns a Promise that resolves to an object containing tokens generated for the newly created
   * user.
   */
  async createUser(payload: Prisma.UserCreateInput) {
    const hashedPassword = await this.passwordService.hashPassword(payload.password);

    try {
      this.logger.log(`New user: ${payload.email}`);
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            ...payload,
            password: hashedPassword,
          },
        });

        const userRole = await tx.userRole.create({
          data: {
            userId: user.id,
            roleName: 'user',
          },
        });

        this.novuService.createSubscriber(user);

        return this.generateTokens({
          userId: user.id,
          role: [userRole.roleName],
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Email ${payload.email} already used.`);
      } else {
        throw new Error(e);
      }
    }
  }

  async googleAuth(googleUser) {
    const user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      select: {
        id: true,
        email: true,
        password: true,
        picture: true,
        fullName: true,
        UserRole: {
          select: {
            roleName: true,
          },
        },
      },
    });

    if (user === null) {
      // create user
      const newUser = await this.createUser({
        email: googleUser.email,
        password: generateRandomPassword(10),
        fullName: googleUser.name,
        picture: googleUser.picture,
        Provider: {
          create: {
            AuthProvider: {
              connectOrCreate: {
                where: {
                  providerId: googleUser.providerId,
                },
                create: {
                  name: googleUser.provider,
                  providerId: googleUser.providerId,
                },
              },
            },
          },
        },
      });

      return newUser;
    } else {
      const userRole: string[] = user.UserRole.map((role) => role.roleName);
      const payload: UserPayload = {
        userId: user.id,
        role: userRole,
      };
      // update user if needed
      if (user.picture !== googleUser.picture || user.fullName !== googleUser.name) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            fullName: googleUser.name,
            picture: googleUser.picture,
          },
        });
      }

      return this.generateTokens(payload);
    }
    // map role to string
  }

  async validateAccessToken(authToken: string) {
    if (!authToken) return;
    const dt = this.jwtService.decode(authToken);
    if (!dt['id']) return;
    const user = await this.prisma.user.findUnique({
      where: { id: dt['id'] },
    });
    return user;
  }

  async login(loginInput: LoginRequestDto, passwordLess?: boolean): Promise<any> {
    const { email, password } = loginInput;

    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        email: true,
        password: true,
        UserRole: {
          select: {
            roleName: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`Email or password is incorrect`);
    }
    // map role to string
    if (!passwordLess) {
      const passwordValid = await this.passwordService.validatePassword(password, user.password);

      if (!passwordValid) {
        throw new BadRequestException('Invalid password');
      }
    }

    const userRole: string[] = user.UserRole.map((role) => role.roleName);
    const payload: UserPayload = {
      userId: user.id,
      role: userRole,
    };

    return {
      ...this.generateTokens(payload),
      user: user,
    };
  }

  getUserRoles(
    user: User & {
      UserRole: UserRole[];
    }
  ): string[] {
    return user.UserRole.map((role) => role.roleName);
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserRole: {
          include: {
            Role: {
              include: {
                RolePermission: {
                  include: {
                    Permission: true,
                  },
                },
              },
            },
          },
        },
        Provider: true,
      },
    });

    // extract roles
    const roles = user.UserRole.map((role) => role.roleName);
    const permissions = user.UserRole.flatMap((role) =>
      role.Role.RolePermission.map((permission) => permission.Permission.name)
    );
    const permissionsSet = new Set(permissions);
    const permissionsArray = Array.from(permissionsSet);
    const userWithRoles = {
      ...user,
      roles,
      permissions: permissionsArray,
    };

    delete userWithRoles.password;
    delete userWithRoles.UserRole;

    return userWithRoles;
  }

  generateTokens(payload: UserPayload): Token {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  private generateAccessToken(payload: UserPayload): string {
    const p = {
      ...payload,
    };
    return this.jwtService.sign(p);
  }

  private generateRefreshToken(payload: { userId: string }): string {
    const securityConfig = this.configService.get<SecurityConfig>('security');
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: securityConfig.refreshIn,
    });
  }

  /* A method to refresh the token. */
  async refreshToken(token: string) {
    try {
      const { userId } = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserRole: true,
        },
      });

      return this.generateTokens({
        userId: user.id,
        role: this.getUserRoles(user),
      });
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  async resetPassword(args: { token: string; password: string }) {
    // validate token
    const { token, password } = args;
    const { id } = this.jwtService.verify(token, {
      secret: this.configService.get('JWT_RESET_SECRET'),
    });

    // update password
    const hashedPassword = await this.passwordService.hashPassword(password);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    return user;
  }
  async forgotPassword(email: string) {
    // find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`No user found for email: ${email}`);
    }

    // generate token

    const token = this.jwtService.sign(
      {
        id: user.id,
      },
      {
        secret: this.configService.get('JWT_RESET_SECRET'),
        expiresIn: '1h',
      }
    );

    // send email
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  }

  async changePassword(input: ChangePasswordInput, user: User) {
    const { oldPassword, newPassword } = input;

    // find user and password

    const oldUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        password: true,
      },
    });

    const passwordValid = await this.passwordService.validatePassword(
      oldPassword,
      oldUser.password
    );

    if (!passwordValid) {
      throw new BadRequestException('Invalid password');
    }

    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    return 'Password changed successfully';
  }
}
