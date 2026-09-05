import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { BulkMatchAction } from '@ludo-game/shared-types';

export class CreateMatchDto {
  @IsMongoId()
  tournamentId!: string;

  @IsOptional()
  @IsString()
  round?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  matchNumber?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  playerUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  random?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  groupName?: string;
}

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  groupName?: string;
}

export class AddPlayerDto {
  @IsMongoId()
  userId!: string;
}

export class AssignPlayersDto {
  @IsArray()
  @IsMongoId({ each: true })
  playerUserIds!: string[];
}

export class BulkMatchActionDto {
  @IsIn(['ready', 'start', 'cancel', 'delete'])
  action!: BulkMatchAction;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsMongoId({ each: true })
  matchIds!: string[];
}

export class CreateMatchGroupsDto {
  @IsMongoId()
  tournamentId!: string;

  @IsOptional()
  @IsString()
  round?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;
}
