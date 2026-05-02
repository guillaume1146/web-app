import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryItemDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class TransitionDto {
  @IsOptional()
  @IsString()
  instanceId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  bookingType?: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  contentData?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventoryItems?: InventoryItemDto[];
}
