import { Module } from '@nestjs/common';
import { CorporateController } from './corporate.controller';
import { CorporateService } from './corporate.service';
import { ReimbursementService } from './reimbursement/reimbursement.service';
import { PolicyRenewalService } from './policy-renewal.service';
import { PreAuthorizationService } from './pre-authorization.service';
import { ReceiptOcrService } from './receipt-ocr.service';

// TreasuryService now lives in SharedModule (global) so every 85/15 split
// site — booking payment, inventory order, subscription debit — can credit
// PlatformTreasury without each module importing CorporateModule.
@Module({
  controllers: [CorporateController],
  providers: [
    CorporateService,
    ReimbursementService,
    PolicyRenewalService,
    PreAuthorizationService,
    ReceiptOcrService,
  ],
  exports: [
    CorporateService,
    ReimbursementService,
    PolicyRenewalService,
    PreAuthorizationService,
    ReceiptOcrService,
  ],
})
export class CorporateModule {}
