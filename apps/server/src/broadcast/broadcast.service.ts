import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BroadcastStateDto } from '@ludo-game/shared-types';
import { RealtimeService } from '../realtime/realtime.service';
import { logEvent } from '../common/logger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class BroadcastSetting {
  @Prop({ required: true, unique: true, default: 'global' })
  key!: string;

  @Prop({ type: Types.ObjectId, ref: 'Match', default: null })
  matchId!: Types.ObjectId | null;
}

export type BroadcastSettingDocument = HydratedDocument<BroadcastSetting>;
export const BroadcastSettingSchema = SchemaFactory.createForClass(BroadcastSetting);

@Injectable()
export class BroadcastService {
  private matchId: string | null = null;

  constructor(
    @InjectModel(BroadcastSetting.name)
    private readonly settings: Model<BroadcastSettingDocument>,
    private readonly realtime: RealtimeService
  ) {}

  currentMatchId(): string | null {
    return this.matchId;
  }

  async restore(): Promise<void> {
    const row = await this.settings.findOne({ key: 'global' }).exec();
    this.matchId = row?.matchId ? String(row.matchId) : null;
  }

  async setMatch(matchId: string | null): Promise<string | null> {
    this.matchId = matchId;
    await this.settings.findOneAndUpdate(
      { key: 'global' },
      { key: 'global', matchId: matchId ? new Types.ObjectId(matchId) : null },
      { upsert: true }
    );
    this.realtime.emitToBroadcast('broadcast-match-changed', { matchId });
    logEvent('Broadcast match changed', { matchId: matchId ?? '' });
    return this.matchId;
  }

  snapshot(): BroadcastStateDto {
    return { matchId: this.matchId, match: null };
  }
}
