import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Message } from 'src/messages/message.model';
import { MessageService } from 'src/messages/message.service';
import { UsersService } from 'src/users/users.service';
import { Room } from 'src/messages/room.model';
import { User } from 'src/users/users.model';
import { UserRoom } from 'src/messages/user-room.model';
import { SocketGateway } from './socket.gateway';

@Module({
  providers: [SocketService, SocketGateway, MessageService, UsersService],
  imports: [SequelizeModule.forFeature([Message, Room, User, UserRoom])],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
