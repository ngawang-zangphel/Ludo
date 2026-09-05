import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '@ludo-game/shared-types';

export class BulkUserRowDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;
}

export class BulkCreateUsersDto {
  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkUserRowDto)
  users!: BulkUserRowDto[];
}
