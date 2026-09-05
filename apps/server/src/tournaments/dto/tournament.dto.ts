import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { GameType, SnakesLevelId, TournamentStatus } from '@ludo-game/shared-types';

export class RoundDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  number!: number;
}

export class SnakesTeleportDto {
  @IsInt()
  @Min(1)
  @Max(100)
  from!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  to!: number;
}

export class SnakesBoardLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SnakesTeleportDto)
  snakes!: SnakesTeleportDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SnakesTeleportDto)
  ladders!: SnakesTeleportDto[];
}

export class CreateTournamentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

  @IsOptional()
  @IsEnum(SnakesLevelId)
  snakesLevelId?: SnakesLevelId;

  @IsOptional()
  @ValidateNested()
  @Type(() => SnakesBoardLayoutDto)
  snakesLayout?: SnakesBoardLayoutDto;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  marriageDeckCount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoundDto)
  rounds?: RoundDto[];
}

export class UpdateTournamentStatusDto {
  @IsEnum(TournamentStatus)
  status!: TournamentStatus;
}

export class UpdateTournamentSnakesRulesDto {
  @IsOptional()
  @IsEnum(SnakesLevelId)
  snakesLevelId?: SnakesLevelId;

  @IsOptional()
  @ValidateNested()
  @Type(() => SnakesBoardLayoutDto)
  snakesLayout?: SnakesBoardLayoutDto;
}

export class RegisterParticipantDto {
  @IsMongoId()
  userId!: string;
}
