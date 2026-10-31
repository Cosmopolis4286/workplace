import { Equals } from 'class-validator';

export class DeleteAccountDto {
  // Confirmación explícita escrita por el usuario: evita borrados por un
  // clic accidental o por una petición armada sin intención.
  @Equals('ELIMINAR', { message: 'Escribe ELIMINAR para confirmar' })
  confirmation: string;
}
