import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { SocketService } from './socket.service';
import { Message } from 'src/messages/message.model';
import {
  Injectable,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { User } from 'src/users/users.model';
import { WsThrottlerGuard } from './socket.guard';
import { JoinRoomDto } from 'src/messages/dto/join-room.dto';
import { KickUserDto } from 'src/messages/dto/kick-user.dto';
import { CreateMessageDto } from 'src/messages/dto/create-message.dto';
import { MessageEventType } from 'src/utils/interfaces';
import { ActionDto } from 'src/messages/dto/action.dto';
import { JwtService } from '@nestjs/jwt';
import { ReadMessageDto } from 'src/messages/dto/read-message.dto';
import { ParseJsonPipe } from './lib/ParseJsonPipe';
import { WsExceptionFilter } from './events.filter';
import { EEventReason } from './lib/enum';
import { Room } from 'src/messages/room.model';
import { isRoom } from './lib/helpers';
import { Notification } from 'src/notifications/notifications.model';

interface ServerToClientEvents {
  chat: (e: Message) => void;
}

interface ClientToServerEvents {
  chat: (e: Message) => void;
  join_room: (e: { user: User; roomId: number; userId: number }) => void;
}

type SocketData = {
  user: User;
  rooms: string[];
};

export type AppSocket = Socket<any, any, any, SocketData>;
export type AppServer = Server<any, any, any, SocketData>;

@UsePipes(ParseJsonPipe, ValidationPipe)
@UseFilters(WsExceptionFilter)
@WebSocketGateway(Number(process.env.WS_PORT ?? 7002), {
  cors: true,
})
@Injectable()
export class SocketGateway
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server = new Server<
    ServerToClientEvents,
    ClientToServerEvents
  >();

  constructor(
    private readonly socketService: SocketService,
    private readonly jwtService: JwtService,
  ) {}

  @UseGuards(WsThrottlerGuard)
  public afterInit(server: AppServer) {
    server.use(async (socket, next) => {
      const authHeader = socket.handshake.headers.authorization;
      const token = authHeader.split(' ')[1];
      try {
        const user = this.jwtService.verify(token, {
          secret: process.env.PRIVATE_KEY,
        });
        socket.data.user = user;
        socket.data.rooms = await this.socketService.addUserToAllRooms(
          socket?.id,
          user.id,
        );
      } catch (e) {
        next(new WsException(EEventReason.INVALID_TOKEN));
        socket.disconnect(true);
        return;
      }
      next();
    });
  }

  async handleConnection(socket: AppSocket): Promise<void> {
    const { user, rooms } = socket.data;
    this.socketService.updateUserActivity(user?.id);

    socket.broadcast.emit(MessageEventType.ONLINE, user?.id);

    socket.conn.on('heartbeat', () => {
      this.socketService.updateUserActivity(user?.id);
    });

    socket.join(rooms);
  }

  @UseGuards(WsThrottlerGuard)
  async handleDisconnect(socket: Socket): Promise<void> {
    // await this.socketService.removeUserFromAllRooms(socket.id);
    socket.broadcast.emit(MessageEventType.OFFLINE, socket.data.user.id);
  }

  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage(MessageEventType.SEND_MESSAGE)
  async handleChatEvent(
    @MessageBody()
    payload: CreateMessageDto,
    @ConnectedSocket() socket: AppSocket,
  ): Promise<Message | Room> {
    let data: Message | Room;

    if (payload.roomId) {
      data = await this.socketService.createMessage(
        payload as CreateMessageDto & { roomId: number },
        socket.data.user.id,
      );
    } else if (payload.hireId) {
      data = await this.socketService.createMessageByHireId(
        payload as CreateMessageDto & { hireId: number },
        socket.data.user.id,
      );
    } else if (payload.userId) {
      data = await this.socketService.createMessageByUserId(
        payload as CreateMessageDto & { userId: number },
        socket.data.user.id,
      );
    }

    // if no room created so do not need extra logic just broadcast
    if (!isRoom(data)) {
      socket.to(String(data.roomId)).emit(MessageEventType.NEW_MESSAGE, data);
      return data;
    }

    // else should find new interlocutor
    const sockets = await this.server.fetchSockets();
    const userRoomeInterlocutor = data.userRooms.find((userRoom) => {
      return userRoom.userId !== socket.data.user.id;
    });

    socket.data.rooms.push(String(data.id));
    socket.join(String(data.id));

    const onlineTargetUserSocket = sockets.find(
      (onlineSocket) =>
        onlineSocket.data.user.id === userRoomeInterlocutor.userId,
    );

    // emit if online
    if (onlineTargetUserSocket) {
      onlineTargetUserSocket.data.rooms.push(String(data.id));
      onlineTargetUserSocket.join(String(data.id));
      this.server
        .to(onlineTargetUserSocket.id)
        .emit(MessageEventType.NEW_ROOM, data);
    }

    return data;
  }

  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage(MessageEventType.JOIN_ROOM)
  async handleJoinRoomEvent(
    @MessageBody()
    payload: JoinRoomDto,
    @ConnectedSocket() socket: AppSocket,
  ): Promise<boolean> {
    const result = await this.socketService.joinRoom(
      payload.roomId,
      socket.data.user.id,
      socket.id,
    );
    this.server.in(socket.id).socketsJoin(`${payload.roomId}`);
    return result;
  }

  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage(MessageEventType.TYPE)
  async handleTypingEvent(
    @MessageBody()
    payload: ActionDto,
    @ConnectedSocket() socket: AppSocket,
  ): Promise<boolean> {
    socket.to(`${payload.roomId}`).emit(MessageEventType.TYPING, {
      roomId: payload.roomId,
      userId: socket.data.user.id,
      lastTypingAt: new Date(),
    });
    return true;
  }

  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage(MessageEventType.KICK_USER)
  async handleKickUserEvent(
    @MessageBody() payload: KickUserDto,
    @ConnectedSocket() socket: AppSocket,
  ): Promise<boolean> {
    this.server
      .to(`${payload.roomId}`)
      .emit(MessageEventType.KICK_USER, payload);
    this.server.in(socket.id).socketsLeave(`${payload.roomId}`);
    this.server
      .to(`${payload.roomId}`)
      .emit(MessageEventType.NEW_MESSAGE, payload);
    return true;
  }

  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage(MessageEventType.READ_MESSAGE)
  async handleReadMessage(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() data: ReadMessageDto,
  ) {
    const res = await this.socketService.readMessage(socket.data.user.id, data);
    if (res) {
      socket.to(String(data.roomId)).emit(MessageEventType.MESSAGE_WAS_READ, {
        roomId: data.roomId,
        lastReadMessageId: data.lastReadMessageId,
        userId: socket.data.user.id,
      });
      return res;
    }
  }

  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage(MessageEventType.READ_NOTIFICATION)
  async handleReadNotification(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() data: { id?: number },
  ) {
    return await this.socketService.readNotification(
      socket.data.user.id,
      data?.id,
    );
  }

  public async handleNewNotification(notification: Notification): Promise<any> {
    const sockets = await this.server.fetchSockets();
    const onlineTargetUserSocket = sockets.find(
      (onlineSocket) => onlineSocket.data.user.id === notification.userId,
    );
    if (onlineTargetUserSocket) {
      this.server
        .to(onlineTargetUserSocket.id)
        .emit(MessageEventType.NEW_NOTIFICATION, notification);
    }
  }

  public async emitMessageUpdate(updatedMessage: Message): Promise<any> {
    this.server
      .to(`${updatedMessage.roomId}`)
      .emit(MessageEventType.UPDATE_MESSAGE, updatedMessage);
  }
}
