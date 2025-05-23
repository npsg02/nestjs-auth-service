import { AuthService } from '@/modules/auth/auth.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector, private authService: AuthService) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
  async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    console.log(context.switchToHttp().getRequest());
    return true;
    // const { user } = context.req;
    // const roles = this.reflector.getAllAndOverride<String[]>('roles', [
    //   context.getHandler(),
    //   context.getClass(),
    // ]);
    // if (!roles) return true;
    // return roles.some((role) => user.role === role);
  }
}
