import { IsString } from 'class-validator';

export class RescheduleBookingDto {
  @IsString()
  bookingId: string;

  @IsString()
  bookingType: string;

  @IsString()
  newDate: string;

  @IsString()
  newTime: string;
}
