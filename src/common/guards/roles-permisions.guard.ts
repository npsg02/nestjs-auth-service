import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class RolesPermissionsGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Create missing roles in the DB
    if (requiredRoles && requiredRoles.length > 0) {
      for (const role of requiredRoles) {
        await this.prisma.role.upsert({
          where: { name: role },
          update: {},
          create: { name: role },
        });
      }
    }

    // Create missing permissions in the DB
    if (requiredPermissions && requiredPermissions.length > 0) {
      for (const permission of requiredPermissions) {
        await this.prisma.permission.upsert({
          where: { name: permission },
          update: {},
          create: { name: permission },
        });
      }
    }

    // Check user roles/permissions
    const { user } = context.switchToHttp().getRequest();
    console.log('user', user);
    if (!user) {
      return false;
    }

    const hasRole = requiredRoles ? requiredRoles.some((role) => user.roles?.includes(role)) : true;
    const hasPermission = requiredPermissions
      ? requiredPermissions.some((perm) => user.permissions?.includes(perm))
      : true;

    return hasRole && hasPermission;
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
