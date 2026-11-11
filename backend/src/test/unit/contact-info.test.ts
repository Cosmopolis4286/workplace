import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  detectContactInfo,
  redactContacts,
} from '../../common/utils/contact-redaction.util';
import { CreateMessageDto } from '../../domains/commerce-core/services/messages/dto/create-message.dto';
import { withClientContactForViewer } from '../../domains/commerce-core/services/services.service';

describe('Datos de contacto fuera de la plataforma', () => {
  it.each([
    'Mi número es 0414-123.45.67',
    'llámame 04141234567',
    '+58 (414) 123 4567',
    '0 4 1 4 1 2 3 4 5 6 7',
    'cero cuatro uno cuatro uno dos tres cuatro cinco seis siete',
    'escríbeme a juan.perez@gmail.com',
    'juan arroba gmail punto com',
    'wa.me/584141234567',
    'sígueme @juan.servicios',
    'pásame tu whatsapp',
  ])('detecta: %s', (text) => {
    expect(detectContactInfo(text).length).toBeGreaterThan(0);
  });

  it.each([
    'El trabajo cuesta Bs 1.250.000,00',
    'Son 1.500.000 bs con materiales',
    'Precio: 2500000',
    'Llego a las 3 pm, son 2 horas de trabajo',
    'Necesito reparar 3 tomas y 2 interruptores en la calle 5',
    'El presupuesto total es $ 45, incluye 2 visitas',
  ])('no confunde con un contacto: %s', (text) => {
    expect(detectContactInfo(text)).toEqual([]);
  });

  it('oculta el contacto en mensajes antiguos', () => {
    const { text, redacted } = redactContacts('llámame al 0414-1234567 mañana');
    expect(redacted).toBe(true);
    expect(text).not.toMatch(/0414/);
    expect(text).toContain('[dato de contacto oculto]');
  });

  it('el chat rechaza un mensaje con teléfono (validación del DTO)', async () => {
    const dto = plainToInstance(CreateMessageDto, {
      body: 'mi cel 04121234567',
    });
    const errors = await validate(dto);
    expect(
      errors.map((e) => Object.keys(e.constraints ?? {})).flat()
    ).toContain('noContactInfo');
    const ok = plainToInstance(CreateMessageDto, {
      body: 'Paso mañana a las 9',
    });
    expect(await validate(ok)).toEqual([]);
  });

  describe('lo que ve el proveedor de la solicitud', () => {
    const req = {
      providerId: 'prov',
      status: 'PENDING',
      clientPhone: '04141234567',
      clientEmail: 'ana@x.com',
      address: 'Calle 5, casa 3',
    };

    it('nunca ve teléfono ni correo; la dirección solo después de aceptar', () => {
      const pending = withClientContactForViewer(req, 'prov');
      expect(pending).toMatchObject({
        clientPhone: null,
        clientEmail: null,
        address: null,
        contactHidden: true,
      });
      const accepted = withClientContactForViewer(
        { ...req, status: 'CONTACTED' },
        'prov'
      );
      expect(accepted).toMatchObject({
        clientPhone: null,
        clientEmail: null,
        address: 'Calle 5, casa 3',
      });
    });

    it('el propio cliente sí ve sus datos', () => {
      expect(withClientContactForViewer(req, 'cliente')).toMatchObject({
        clientPhone: '04141234567',
        contactHidden: false,
      });
    });
  });
});
