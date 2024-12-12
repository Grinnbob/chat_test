import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/users.model';
import { SocketGateway } from './socket.gateway';
import { ChatService } from 'src/chat/chat.service';
import { Message } from 'src/chat/models/message.model';
import { Room } from 'src/chat/models/room.model';
import { UserRoom } from 'src/chat/models/user-room.model';

@Module({
  providers: [SocketGateway, ChatService, UsersService],
  imports: [SequelizeModule.forFeature([Message, Room, User, UserRoom])],
  exports: [SocketGateway],
})
export class SocketModule {}
