import { IsOptional, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  invitationId?: string;
}
