import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BroadcastService, BroadcastSetting, BroadcastSettingSchema } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { MatchesModule } from '../matches/matches.module';
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BroadcastSetting.name, schema: BroadcastSettingSchema }]),
    RealtimeModule,
    AuthModule,
    forwardRef(() => MatchesModule),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
