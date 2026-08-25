import { Type } from 'class-transformer';
import { IsString, MinLength, ValidateNested } from 'class-validator';
import { SnakesBoardLayoutDto } from '../../tournaments/dto/tournament.dto';

export class CreateSnakesBoardDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @ValidateNested()
  @Type(() => SnakesBoardLayoutDto)
  layout!: SnakesBoardLayoutDto;
}

export class UpdateSnakesBoardDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @ValidateNested()
  @Type(() => SnakesBoardLayoutDto)
  layout!: SnakesBoardLayoutDto;
}
