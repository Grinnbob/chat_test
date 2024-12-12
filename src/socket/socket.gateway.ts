import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import {
  Injectable,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { User } from 'src/users/users.model';
import { ParseJsonPipe } from './lib/ParseJsonPipe';
import { WsExceptionFilter } from './events.filter';
import { ChatService } from 'src/chat/chat.service';

type SocketData = {
  user: User;
  rooms: string[];
};

export type AppSocket = Socket<any, any, any, SocketData>;
export type AppServer = Server<any, any, any, SocketData>;

@UsePipes(ParseJsonPipe, ValidationPipe)
@UseFilters(WsExceptionFilter)
@WebSocketGateway(Number(process.env.WS_PORT), {
  cors: true,
})
@Injectable()
@WebSocketGateway()
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {
    this.chatService.setServer(this.server);
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    client: any,
    payload: { name: string; participants: number },
  ) {
    const { name, participants } = payload;
    await this.chatService.joinQueue(name, participants, client.id);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: any,
    payload: { roomId: string; message: string },
  ) {
    const senderId = client.id;
    const { roomId, message } = payload;
    await this.chatService.sendMessage(roomId, senderId, message);
  }

  @SubscribeMessage('getRoomHistory')
  async handleGetRoomHistory(client: any, payload: { roomId: string }) {
    const { roomId } = payload;
    const history = await this.chatService.getRoomHistory(roomId);
    client.emit('roomHistory', history);
  }

  // @SubscribeMessage('userTyping')
  // async handleUserTyping(client: any, payload: { roomId: string }) {
  //   const senderId = client.id;
  //   const { roomId } = payload;
  //   await this.chatService.handleTyping(roomId, senderId);
  // }
}
