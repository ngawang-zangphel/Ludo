import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AdminMatchPayload,
  AdminSetBroadcastPayload,
  ClientToServerEvents,
  JoinMatchPayload,
  MovePiecePayload,
  ReconnectMatchPayload,
  RollDicePayload,
  ServerToClientEvents,
  UserRole,
} from '@ludo-game/shared-types';
import { AuthService } from '../auth/auth.service';
import { MatchesService } from '../matches/matches.service';
import { BroadcastService } from '../broadcast/broadcast.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SessionUser } from '../common/types';
import { ADMIN_ROOM, BROADCAST_ROOM, matchRoom } from '../common/rooms';
import { GameEngineError } from '@ludo-game/shared-types';

type ArenaSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: { user?: SessionUser; matchId?: string };
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(
    private readonly auth: AuthService,
    private readonly matches: MatchesService,
    private readonly broadcast: BroadcastService,
    private readonly realtime: RealtimeService
  ) {}

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.realtime.setServer(server);
  }

  handleConnection(client: ArenaSocket): void {
    const cookies = parseCookies(client.handshake.headers.cookie);
    const user = this.auth.verifyToken(cookies[this.auth.cookieName]);
    if (!user) {
      client.emit('match-error', { code: 'UNAUTHENTICATED', message: 'Authentication required' });
      client.disconnect();
      return;
    }
    client.data.user = user;
  }

  async handleDisconnect(client: ArenaSocket): Promise<void> {
    const user = client.data.user;
    const matchId = client.data.matchId;
    if (user && matchId) {
      await this.matches.setConnected(matchId, user.id, false);
    }
  }

  @SubscribeMessage('join-match')
  async joinMatch(
    @ConnectedSocket() client: ArenaSocket,
    @MessageBody() payload: JoinMatchPayload
  ): Promise<void> {
    const user = this.requireUser(client);
    const detail = await this.matches.getDetail(payload.matchId);
    const isPlayer = detail.players.some((player) => player.userId === user.id);
    if (client.data.matchId && client.data.matchId !== payload.matchId) {
      client.leave(matchRoom(client.data.matchId));
    }
    client.join(matchRoom(payload.matchId));
    client.data.matchId = payload.matchId;
    if (isPlayer) {
      await this.matches.setConnected(payload.matchId, user.id, true);
    }
    if (detail.gameState) {
      client.emit('match-state', { matchId: payload.matchId, state: detail.gameState });
    }
  }

  @SubscribeMessage('leave-match')
  async leaveMatch(
    @ConnectedSocket() client: ArenaSocket,
    @MessageBody() payload: JoinMatchPayload
  ): Promise<void> {
    const user = this.requireUser(client);
    client.leave(matchRoom(payload.matchId));
    if (client.data.matchId === payload.matchId) {
      client.data.matchId = undefined;
    }
    if (payload.matchId) {
      await this.matches.setConnected(payload.matchId, user.id, false);
    }
  }

  @SubscribeMessage('reconnect-match')
  async reconnect(
    @ConnectedSocket() client: ArenaSocket,
    @MessageBody() payload: ReconnectMatchPayload
  ): Promise<void> {
    await this.joinMatch(client, payload);
  }

  @SubscribeMessage('roll-dice')
  async rollDice(
    @ConnectedSocket() client: ArenaSocket,
    @MessageBody() payload: RollDicePayload
  ): Promise<void> {
    const user = this.requireUser(client);
    try {
      await this.matches.rollDice(payload.matchId, user.id);
    } catch (error) {
      this.emitError(client, payload.matchId, error);
    }
  }

  @SubscribeMessage('move-piece')
  async movePiece(
    @ConnectedSocket() client: ArenaSocket,
    @MessageBody() payload: MovePiecePayload
  ): Promise<void> {
    const user = this.requireUser(client);
    try {
      await this.matches.movePiece(payload.matchId, user.id, payload.pieceId);
    } catch (error) {
      this.emitError(client, payload.matchId, error);
    }
  }

  @SubscribeMessage('admin-subscribe')
  async adminSubscribe(@ConnectedSocket() client: ArenaSocket): Promise<void> {
    this.requireAdmin(client);
    client.join(ADMIN_ROOM);
    const matches = await this.matches.list({});
    client.emit('matches-updated', {
      matches,
      broadcastMatchId: this.broadcast.currentMatchId(),
    });
  }

  @SubscribeMessage('join-broadcast')
  async joinBroadcast(@ConnectedSocket() client: ArenaSocket): Promise<void> {
    this.requireUser(client);
    client.join(BROADCAST_ROOM);
    const matchId = this.broadcast.currentMatchId();
    client.emit('broadcast-match-changed', { matchId });
    if (matchId) {
      const detail = await this.matches.getDetail(matchId);
      if (detail.gameState) {
        client.emit('match-state', { matchId, state: detail.gameState });
      }
    }
  }

  @SubscribeMessage('leave-broadcast')
  leaveBroadcast(@ConnectedSocket() client: ArenaSocket): void {
    client.leave(BROADCAST_ROOM);
  }

  @SubscribeMessage('admin-start-match')
  async adminStart(@ConnectedSocket() client: ArenaSocket, @MessageBody() payload: AdminMatchPayload): Promise<void> {
    this.requireAdmin(client);
    await this.matches.start(payload.matchId);
  }

  @SubscribeMessage('admin-pause-match')
  async adminPause(@ConnectedSocket() client: ArenaSocket, @MessageBody() payload: AdminMatchPayload): Promise<void> {
    this.requireAdmin(client);
    await this.matches.pause(payload.matchId);
  }

  @SubscribeMessage('admin-resume-match')
  async adminResume(@ConnectedSocket() client: ArenaSocket, @MessageBody() payload: AdminMatchPayload): Promise<void> {
    this.requireAdmin(client);
    await this.matches.resume(payload.matchId);
  }

  @SubscribeMessage('admin-restart-match')
  async adminRestart(@ConnectedSocket() client: ArenaSocket, @MessageBody() payload: AdminMatchPayload): Promise<void> {
    this.requireAdmin(client);
    await this.matches.restart(payload.matchId);
  }

  @SubscribeMessage('admin-cancel-match')
  async adminCancel(@ConnectedSocket() client: ArenaSocket, @MessageBody() payload: AdminMatchPayload): Promise<void> {
    this.requireAdmin(client);
    await this.matches.cancel(payload.matchId);
  }

  @SubscribeMessage('admin-set-broadcast-match')
  async adminBroadcast(
    @ConnectedSocket() client: ArenaSocket,
    @MessageBody() payload: AdminSetBroadcastPayload
  ): Promise<void> {
    this.requireAdmin(client);
    await this.broadcast.setMatch(payload.matchId);
    await this.matches.publishAdmin();
    const detail = await this.matches.getDetail(payload.matchId);
    if (detail.gameState) {
      this.realtime.emitToBroadcast('match-state', {
        matchId: payload.matchId,
        state: detail.gameState,
      });
    }
  }

  private requireUser(client: ArenaSocket): SessionUser {
    if (!client.data.user) {
      throw new Error('UNAUTHENTICATED');
    }
    return client.data.user;
  }

  private requireAdmin(client: ArenaSocket): SessionUser {
    const user = this.requireUser(client);
    if (user.role !== UserRole.ADMIN) {
      client.emit('match-error', { code: 'FORBIDDEN', message: 'Admin only' });
      throw new Error('FORBIDDEN');
    }
    return user;
  }

  private emitError(client: ArenaSocket, matchId: string, error: unknown): void {
    if (error instanceof GameEngineError) {
      client.emit('match-error', { matchId, code: error.code, message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    client.emit('match-error', { matchId, code: 'MATCH_ERROR', message });
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) {
    return cookies;
  }
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) {
      continue;
    }
    cookies[rawKey] = decodeURIComponent(rest.join('='));
  }
  return cookies;
}
