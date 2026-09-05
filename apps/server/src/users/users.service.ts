import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hash, compare } from 'bcrypt';
import { BulkUserCreateResultDto, MatchStatus, UserDto, UserRole } from '@ludo-game/shared-types';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toObjectIdString } from '../common/types';
import { Match, MatchDocument } from '../matches/schemas/match.schema';
import {
  TournamentParticipant,
  TournamentParticipantDocument,
} from '../tournaments/schemas/participant.schema';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Match.name) private readonly matches: Model<MatchDocument>,
    @InjectModel(TournamentParticipant.name)
    private readonly participants: Model<TournamentParticipantDocument>
  ) {}

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

  async createMany(dto: BulkCreateUsersDto): Promise<BulkUserCreateResultDto> {
    const role = dto.role ?? UserRole.PLAYER;
    const failed: BulkUserCreateResultDto['failed'] = [];
    const unique = new Map<string, { row: number; name: string; email: string }>();

    dto.users.forEach((row, index) => {
      const email = row.email.trim().toLowerCase();
      const name = row.name.trim();
      const sheetRow = index + 2;
      if (name.length < 2) {
        failed.push({ row: sheetRow, name, email, reason: 'Name is too short' });
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        failed.push({ row: sheetRow, name, email, reason: 'Invalid email' });
        return;
      }
      if (unique.has(email)) {
        failed.push({ row: sheetRow, name, email, reason: 'Duplicate email in the sheet' });
        return;
      }
      unique.set(email, { row: sheetRow, name, email });
    });

    const existing = await this.users
      .find({ email: { $in: [...unique.keys()] } })
      .select('email')
      .lean()
      .exec();
    for (const doc of existing) {
      const row = unique.get(doc.email);
      if (row) {
        failed.push({ ...row, reason: 'Email already registered' });
        unique.delete(doc.email);
      }
    }

    if (!unique.size) {
      return { created: [], failed: failed.sort((a, b) => a.row - b.row) };
    }

    const passwordHash = await hash(dto.password, 12);
    const createdDocs = await this.users.insertMany(
      [...unique.values()].map((row) => ({
        email: row.email,
        name: row.name,
        passwordHash,
        role,
      })),
      { ordered: false }
    );

    return {
      created: createdDocs.map((user) => this.toDto(user)),
      failed: failed.sort((a, b) => a.row - b.row),
    };
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

  async listAll(): Promise<UserDto[]> {
    const users = await this.users.find().sort({ name: 1 }).exec();
    return users.map((user) => this.toDto(user));
  }

  async listPlayers(): Promise<UserDto[]> {
    const users = await this.users.find({ role: UserRole.PLAYER }).sort({ name: 1 }).exec();
    return users.map((user) => this.toDto(user));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.findById(id);
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.users.findOne({ email: dto.email.toLowerCase() }).exec();
      if (taken) {
        throw new ConflictException('Email already registered');
      }
      user.email = dto.email.toLowerCase();
    }
    if (dto.name) {
      user.name = dto.name;
    }
    if (dto.role) {
      if (user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
        const admins = await this.users.countDocuments({ role: UserRole.ADMIN });
        if (admins <= 1) {
          throw new BadRequestException('Cannot demote the last admin');
        }
      }
      user.role = dto.role;
    }
    if (dto.password) {
      user.passwordHash = await hash(dto.password, 12);
    }
    await user.save();
    return this.toDto(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user.role === UserRole.ADMIN) {
      const admins = await this.users.countDocuments({ role: UserRole.ADMIN });
      if (admins <= 1) {
        throw new BadRequestException('Cannot delete the last admin');
      }
    }
    const live = await this.matches
      .findOne({
        'players.userId': user._id,
        status: MatchStatus.LIVE,
      })
      .exec();
    if (live) {
      throw new BadRequestException('Cannot delete a player in a live match');
    }
    await this.participants.deleteMany({ userId: user._id }).exec();
    await this.users.deleteOne({ _id: user._id }).exec();
  }

  async verifyPassword(user: UserDocument, password: string): Promise<boolean> {
    return compare(password, user.passwordHash);
  }

  toDto(user: UserDocument, online = false): UserDto {
    return {
      id: toObjectIdString(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      online,
    };
  }
}
