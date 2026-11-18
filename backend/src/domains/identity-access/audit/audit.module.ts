import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
  providers: [
    AuditService,
    { provide: 'AUDIT_SERVICE', useExisting: AuditService },
  ],
  controllers: [AuditController],
  exports: [AuditService, 'AUDIT_SERVICE'],
})
export class AuditModule {}
