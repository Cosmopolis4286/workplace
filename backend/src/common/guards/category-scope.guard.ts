import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CATEGORY_SCOPE_KEY, CategoryScopeOptions } from '../decorators/require-category-scope.decorator';
import { CategoryScopeService } from '../category-scope/category-scope.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard de escritura para @RequireCategoryScope — ver ese decorador para el
 * contexto completo. Rechaza con 403 si el categoryId elegido no aplica al
 * rubro de negocio del usuario (UserCategory.id ∉ item.userCategoryIds,
 * salvo que el ítem no tenga scope configurado).
 */
@Injectable()
export class CategoryScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly categoryScope: CategoryScopeService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<CategoryScopeOptions>(CATEGORY_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const itemCategoryId: string | undefined = request.body?.[options.bodyField];
    if (!itemCategoryId) return true; // campo opcional, sin elegir categoría no hay nada que validar

    const { user } = request;
    if (!user) return false;
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true;

    const item = await (this.prisma[options.model] as any).findUnique({
      where: { id: itemCategoryId },
      select: { userCategoryIds: true },
    });
    if (!item) throw new BadRequestException('Categoría inválida');

    const userCategoryId = await this.categoryScope.getUserCategoryId(user.id);
    if (!this.categoryScope.isVisibleForCategory(item.userCategoryIds, userCategoryId)) {
      throw new ForbiddenException('Esta categoría no está disponible para tu rubro de negocio');
    }
    return true;
  }
}
