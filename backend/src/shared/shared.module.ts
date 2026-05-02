import { Global, Module } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { ReminderService } from './services/reminder.service';
import { RolesResolverService } from './services/roles-resolver.service';
import { AdminAuditService } from './services/admin-audit.service';
import { CleanupService } from './services/cleanup.service';
import { FileValidationService } from './services/file-validation.service';
import { TreasuryService } from './services/treasury.service';
import { LedgerReconciliationService } from './services/ledger-reconciliation.service';
import { MoneyFormatService } from './services/money-format.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [
    InvoiceService,
    ReminderService,
    RolesResolverService,
    AdminAuditService,
    CleanupService,
    FileValidationService,
    TreasuryService,
    LedgerReconciliationService,
    MoneyFormatService,
  ],
  exports: [
    InvoiceService,
    RolesResolverService,
    AdminAuditService,
    FileValidationService,
    TreasuryService,
    LedgerReconciliationService,
    MoneyFormatService,
  ],
})
export class SharedModule {}
