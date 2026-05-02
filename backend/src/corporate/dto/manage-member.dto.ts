import { IsString, IsIn } from 'class-validator';

export class ManageMemberDto {
  @IsString()
  memberId: string;

  @IsIn(['approve', 'reject', 'remove'])
  action: 'approve' | 'reject' | 'remove';
}
