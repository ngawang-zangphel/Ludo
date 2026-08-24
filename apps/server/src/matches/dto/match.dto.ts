import { IsArray, IsBoolean, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

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
}

export class AssignPlayersDto {
  @IsArray()
  @IsMongoId({ each: true })
  playerUserIds!: string[];
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
