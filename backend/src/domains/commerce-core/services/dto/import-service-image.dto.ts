import { IsUrl, IsInt, Min, Max } from 'class-validator';

export class ImportServiceImageDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  // Posición del slot a reemplazar: 0 = principal, 1-2 = secundarias
  @IsInt()
  @Min(0)
  @Max(2)
  slot: number;
}
