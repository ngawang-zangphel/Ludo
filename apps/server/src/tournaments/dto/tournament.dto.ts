import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TournamentStatus } from '@ludo-game/shared-types';

export class RoundDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  number!: number;
}

export class CreateTournamentDto {
  @IsString()
  name!: string;

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

export class RegisterParticipantDto {
  @IsMongoId()
  userId!: string;
}
