import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SnakesBoardsController } from './snakes-boards.controller';
import { SnakesBoardsService } from './snakes-boards.service';
import { SnakesCustomBoard, SnakesCustomBoardSchema } from './schemas/snakes-board.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SnakesCustomBoard.name, schema: SnakesCustomBoardSchema }]),
    AuthModule,
  ],
  controllers: [SnakesBoardsController],
  providers: [SnakesBoardsService],
  exports: [SnakesBoardsService],
})
export class SnakesBoardsModule {}
