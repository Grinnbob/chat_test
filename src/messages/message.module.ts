import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Message } from './message.model';
import { MessageService } from './message.service';
import { User } from 'src/users/users.model';
import { Room } from './room.model';
import { UserRoom } from './user-room.model';
import { MessageController } from './message.controller';

@Module({
  providers: [MessageService],
  controllers: [MessageController],
  imports: [SequelizeModule.forFeature([Message, Room, User, UserRoom])],
  exports: [MessageService],
})
export class MessageModule {}
