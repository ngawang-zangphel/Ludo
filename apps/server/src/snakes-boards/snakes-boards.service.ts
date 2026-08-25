import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  cloneSnakesLayout,
  SnakesCustomBoardDto,
  validateSnakesLayout,
} from '@ludo-game/shared-types';
import { toObjectIdString } from '../common/types';
import { CreateSnakesBoardDto, UpdateSnakesBoardDto } from './dto/snakes-board.dto';
import { SnakesCustomBoard, SnakesCustomBoardDocument } from './schemas/snakes-board.schema';

@Injectable()
export class SnakesBoardsService {
  constructor(
    @InjectModel(SnakesCustomBoard.name)
    private readonly boards: Model<SnakesCustomBoardDocument>
  ) {}

  async list(): Promise<SnakesCustomBoardDto[]> {
    const rows = await this.boards.find().sort({ updatedAt: -1 }).exec();
    return rows.map((row) => this.toDto(row));
  }

  async create(dto: CreateSnakesBoardDto): Promise<SnakesCustomBoardDto> {
    const layout = this.requireValidLayout(dto.layout);
    const board = await this.boards.create({
      name: dto.name.trim(),
      layout,
    });
    return this.toDto(board);
  }

  async update(id: string, dto: UpdateSnakesBoardDto): Promise<SnakesCustomBoardDto> {
    const board = await this.requireBoard(id);
    board.name = dto.name.trim();
    board.layout = this.requireValidLayout(dto.layout);
    await board.save();
    return this.toDto(board);
  }

  async remove(id: string): Promise<void> {
    const result = await this.boards.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Custom board not found');
    }
  }

  private async requireBoard(id: string): Promise<SnakesCustomBoardDocument> {
    const board = await this.boards.findById(id).exec();
    if (!board) {
      throw new NotFoundException('Custom board not found');
    }
    return board;
  }

  private requireValidLayout(layout: CreateSnakesBoardDto['layout']) {
    const cloned = cloneSnakesLayout(layout);
    const error = validateSnakesLayout(cloned);
    if (error) {
      throw new BadRequestException(error);
    }
    return cloned;
  }

  private toDto(board: SnakesCustomBoardDocument): SnakesCustomBoardDto {
    return {
      id: toObjectIdString(board._id),
      name: board.name,
      layout: cloneSnakesLayout(board.layout),
      createdAt: board.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: board.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
