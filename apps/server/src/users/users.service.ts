import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hash, compare } from 'bcrypt';
import { UserDto, UserRole } from '@ludo-game/shared-types';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { toObjectIdString } from '../common/types';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.users.findOne({ email: dto.email.toLowerCase() }).exec();
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await hash(dto.password, 12);
    const user = await this.users.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash,
      role: dto.role ?? UserRole.PLAYER,
    });
    return this.toDto(user);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.users.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listPlayers(): Promise<UserDto[]> {
    const users = await this.users.find({ role: UserRole.PLAYER }).sort({ name: 1 }).exec();
    return users.map((user) => this.toDto(user));
  }

  async verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    return compare(password, user.passwordHash);
  }

  toDto(user: UserDocument): UserDto {
    return {
      id: toObjectIdString(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
