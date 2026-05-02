import { IsString, IsIn } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsString()
  userId: string;

  @IsIn(['approve', 'suspend', 'reject'])
  action: 'approve' | 'suspend' | 'reject';
}
