import { Controller, Get } from '@nestjs/common';
import { features } from '../../../common/config/features';

// Público: el frontend decide qué mostrar con la misma fuente que aplica el
// backend (no con variables de build propias que podrían desalinearse).
@Controller('features')
export class FeaturesController {
  @Get()
  get() {
    return {
      protectedPayments: features.protectedPayments(),
      bnpl: features.bnpl(),
      usageCredits: features.usageCredits(),
    };
  }
}
