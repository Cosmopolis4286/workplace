import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  CONTACT_INFO_NOT_ALLOWED_MESSAGE,
  detectContactInfo,
} from '../utils/contact-redaction.util';

/**
 * Rechaza textos con datos de contacto directo (teléfono, correo, enlaces de
 * mensajería, usuarios de redes). Se aplica a los campos libres que ve la
 * otra parte de una transacción: la conversación se hace dentro de WorkPlace.
 */
export function NoContactInfo(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'noContactInfo',
      target: object.constructor,
      propertyName,
      options: { message: CONTACT_INFO_NOT_ALLOWED_MESSAGE, ...options },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          if (typeof value !== 'string') return true;
          return detectContactInfo(value).length === 0;
        },
      },
    });
  };
}
