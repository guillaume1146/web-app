import { IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class RequiredDocumentConfigItem {
  @IsString()
  userType: string;

  @IsString()
  documentName: string;

  @IsBoolean()
  required: boolean;
}

export class UpdateRequiredDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentConfigItem)
  configs: RequiredDocumentConfigItem[];
}
