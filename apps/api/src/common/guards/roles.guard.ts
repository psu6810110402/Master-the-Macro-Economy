import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    
    const hasRole = requiredRoles.some((role) => String(user.role).toUpperCase() === String(role).toUpperCase());
    
    if (!hasRole) {
      console.log(`[RolesGuard] 403 Forbidden - Required: ${requiredRoles}, UserRole: ${user.role}, UserEmail: ${user.email}`);
      throw new ForbiddenException('Insufficient role to perform this action');
    }
    
    return true;
  }
}
