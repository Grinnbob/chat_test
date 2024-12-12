import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from 'src/users/users.model';
import { MessageController } from './chat.controller';
import { ChatService } from './chat.service';
import { Message } from './models/message.model';
import { Room } from './models/room.model';
import { UserRoom } from './models/user-room.model';

@Module({
  providers: [ChatService],
  controllers: [MessageController],
  imports: [SequelizeModule.forFeature([Message, Room, User, UserRoom])],
  exports: [ChatService],
})
export class MessageModule {}
