import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Message } from 'src/messages/message.model';
import { Room } from 'src/messages/room.model';
import { UserRoom } from 'src/messages/user-room.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [
    SequelizeModule.forFeature([Message, Room, UserRoom, Notification]),
  ],
  exports: [UsersService],
})
export class UsersModule {}
