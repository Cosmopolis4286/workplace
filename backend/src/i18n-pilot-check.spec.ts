import { Test } from '@nestjs/testing';
import { I18nModule, I18nService, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';

describe('i18n pilot setup', () => {
  let i18n: I18nService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: 'es',
          loaderOptions: {
            path: join(__dirname, 'i18n'),
            watch: false,
          },
          resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
        }),
      ],
    }).compile();

    i18n = moduleRef.get(I18nService);
  });

  it('resuelve mensajes en espanol (idioma por defecto)', () => {
    expect(i18n.t('auth.login.invalid_credentials', { lang: 'es' })).toBe('Credenciales incorrectas');
    expect(i18n.t('auth.login.blocked', { lang: 'es' })).toBe('Demasiados intentos fallidos. Espera 15 minutos.');
  });

  it('resuelve mensajes en ingles', () => {
    expect(i18n.t('auth.login.invalid_credentials', { lang: 'en' })).toBe('Invalid credentials');
    expect(i18n.t('auth.login.blocked', { lang: 'en' })).toBe('Too many failed attempts. Wait 15 minutes.');
  });

  it('interpola y pluraliza el mensaje de rate limit (es)', () => {
    const wait1 = i18n.t('common.rate_limit.wait_minutes', { lang: 'es', args: { count: 1 } });
    const wait15 = i18n.t('common.rate_limit.wait_minutes', { lang: 'es', args: { count: 15 } });
    expect(wait1).toBe('1 minuto');
    expect(wait15).toBe('15 minutos');

    const msg = i18n.t('common.rate_limit.exceeded', { lang: 'es', args: { wait: wait15 } });
    expect(msg).toBe('Demasiadas solicitudes. Intenta de nuevo en 15 minutos.');
  });

  it('interpola y pluraliza el mensaje de rate limit (en)', () => {
    const wait1 = i18n.t('common.rate_limit.wait_seconds', { lang: 'en', args: { count: 1 } });
    const wait30 = i18n.t('common.rate_limit.wait_seconds', { lang: 'en', args: { count: 30 } });
    expect(wait1).toBe('1 second');
    expect(wait30).toBe('30 seconds');

    const msg = i18n.t('common.rate_limit.exceeded', { lang: 'en', args: { wait: wait30 } });
    expect(msg).toBe('Too many requests. Try again in 30 seconds.');
  });

  it('resuelve mensajes de error compartidos (es/en)', () => {
    expect(i18n.t('common.errors.access_denied', { lang: 'es' })).toBe('Acceso denegado');
    expect(i18n.t('common.errors.access_denied', { lang: 'en' })).toBe('Access denied');
  });

  it('resuelve mensajes del modulo branches (es/en)', () => {
    expect(i18n.t('branches.not_found', { lang: 'es' })).toBe('Sucursal no encontrada');
    expect(i18n.t('branches.not_found', { lang: 'en' })).toBe('Branch not found');
    expect(i18n.t('branches.name_taken', { lang: 'es' })).toBe('Ya existe una sucursal con ese nombre');
    expect(i18n.t('branches.name_taken', { lang: 'en' })).toBe('A branch with that name already exists');
  });

  it('resuelve mensajes del modulo customers (es/en)', () => {
    expect(i18n.t('customers.not_found', { lang: 'es' })).toBe('Cliente no encontrado');
    expect(i18n.t('customers.not_found', { lang: 'en' })).toBe('Customer not found');
    expect(i18n.t('customers.email_taken', { lang: 'es' })).toBe('Ya existe un cliente con ese correo electrónico');
    expect(i18n.t('customers.email_taken', { lang: 'en' })).toBe('A customer with that email already exists');
  });

  it('resuelve mensajes del modulo employees (es/en)', () => {
    expect(i18n.t('employees.not_found', { lang: 'es' })).toBe('Empleado no encontrado');
    expect(i18n.t('employees.not_found', { lang: 'en' })).toBe('Employee not found');
    expect(i18n.t('employees.email_taken', { lang: 'es' })).toBe('Ya existe un empleado con ese correo electrónico');
    expect(i18n.t('employees.email_taken', { lang: 'en' })).toBe('An employee with that email already exists');
  });

  it('resuelve mensajes del modulo users (es/en)', () => {
    expect(i18n.t('users.not_found', { lang: 'es' })).toBe('Usuario no encontrado');
    expect(i18n.t('users.not_found', { lang: 'en' })).toBe('User not found');
    expect(i18n.t('users.permissions.assign_role', { lang: 'es' })).toBe('No puedes asignar ese rol');
    expect(i18n.t('users.permissions.assign_role', { lang: 'en' })).toBe("You can't assign that role");
  });

  it('pluraliza mensajes de uso de categoria/subcategoria (es/en)', () => {
    expect(i18n.t('users.category.in_use', { lang: 'es', args: { count: 1 } }))
      .toBe('No se puede eliminar: 1 usuario usa esta categoría');
    expect(i18n.t('users.category.in_use', { lang: 'es', args: { count: 3 } }))
      .toBe('No se puede eliminar: 3 usuarios usan esta categoría');
    expect(i18n.t('users.category.in_use', { lang: 'en', args: { count: 1 } }))
      .toBe('Cannot delete: 1 user is using this category');
    expect(i18n.t('users.category.in_use', { lang: 'en', args: { count: 3 } }))
      .toBe('Cannot delete: 3 users are using this category');
  });

  it('pluraliza el mensaje de cooldown de username (es/en)', () => {
    const es1 = i18n.t('users.username_cooldown', { lang: 'es', args: { cooldown: 30, daysLeft: 1, count: 1 } });
    const es5 = i18n.t('users.username_cooldown', { lang: 'es', args: { cooldown: 30, daysLeft: 5, count: 5 } });
    expect(es1).toBe('Solo puedes cambiar el nombre de usuario cada 30 días. Podrás cambiarlo en 1 día.');
    expect(es5).toBe('Solo puedes cambiar el nombre de usuario cada 30 días. Podrás cambiarlo en 5 días.');

    const en1 = i18n.t('users.username_cooldown', { lang: 'en', args: { cooldown: 30, daysLeft: 1, count: 1 } });
    expect(en1).toBe('You can only change your username every 30 days. You can change it in 1 day.');
  });

  it('resuelve mensajes del modulo appointments (es/en)', () => {
    expect(i18n.t('appointments.not_found', { lang: 'es' })).toBe('Agendamiento no encontrado');
    expect(i18n.t('appointments.not_found', { lang: 'en' })).toBe('Appointment not found');
    expect(i18n.t('appointments.customer_not_found', { lang: 'es' })).toBe('Cliente no encontrado en este comercio');
    expect(i18n.t('appointments.customer_not_found', { lang: 'en' })).toBe('Customer not found in this commerce');
  });

  it('resuelve mensajes del modulo delivery (es/en)', () => {
    expect(i18n.t('delivery.driver.not_found', { lang: 'es' })).toBe('Repartidor no encontrado');
    expect(i18n.t('delivery.driver.not_found', { lang: 'en' })).toBe('Driver not found');
    expect(i18n.t('delivery.driver.not_found_in_commerce', { lang: 'es' })).toBe('Repartidor no encontrado en este comercio');
    expect(i18n.t('delivery.driver.not_active', { lang: 'es' })).toBe('El repartidor no está activo');
    expect(i18n.t('delivery.driver.not_active', { lang: 'en' })).toBe('The driver is not active');
    expect(i18n.t('delivery.delivery.not_found', { lang: 'es' })).toBe('Entrega no encontrada');
    expect(i18n.t('delivery.delivery.not_found', { lang: 'en' })).toBe('Delivery not found');
  });

  it('resuelve mensajes del modulo expenses (es/en)', () => {
    expect(i18n.t('expenses.not_found', { lang: 'es' })).toBe('Gasto no encontrado');
    expect(i18n.t('expenses.not_found', { lang: 'en' })).toBe('Expense not found');
    expect(i18n.t('expenses.deleted', { lang: 'es' })).toBe('Gasto eliminado correctamente');
    expect(i18n.t('expenses.category.not_found', { lang: 'es' })).toBe('Categoría no encontrada');
    expect(i18n.t('expenses.category.name_taken', { lang: 'en' })).toBe('A category with that name already exists');
  });

  it('pluraliza el mensaje de categoria de gastos en uso (es/en)', () => {
    expect(i18n.t('expenses.category.in_use', { lang: 'es', args: { count: 1 } }))
      .toBe('No se puede eliminar: la categoría tiene 1 gasto asociado');
    expect(i18n.t('expenses.category.in_use', { lang: 'es', args: { count: 4 } }))
      .toBe('No se puede eliminar: la categoría tiene 4 gastos asociados');
    expect(i18n.t('expenses.category.in_use', { lang: 'en', args: { count: 1 } }))
      .toBe('Cannot delete: this category has 1 associated expense');
    expect(i18n.t('expenses.category.in_use', { lang: 'en', args: { count: 4 } }))
      .toBe('Cannot delete: this category has 4 associated expenses');
  });

  it('resuelve mensajes del modulo menu (es/en)', () => {
    expect(i18n.t('menu.category.not_found', { lang: 'es' })).toBe('Categoría no encontrada');
    expect(i18n.t('menu.category.not_found', { lang: 'en' })).toBe('Category not found');
    expect(i18n.t('menu.category.name_taken', { lang: 'es' })).toBe('Ya existe una categoría con ese nombre');
    expect(i18n.t('menu.category.name_taken', { lang: 'en' })).toBe('A category with that name already exists');
    expect(i18n.t('menu.category.has_products', { lang: 'es' })).toBe('No se puede eliminar una categoría con productos. Mueve o elimina los productos primero.');
    expect(i18n.t('menu.category.has_products', { lang: 'en' })).toBe('Cannot delete a category with products. Move or delete the products first.');
    expect(i18n.t('menu.product.not_found', { lang: 'es' })).toBe('Producto no encontrado');
    expect(i18n.t('menu.product.not_found', { lang: 'en' })).toBe('Product not found');
  });
});
