import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Message } from 'src/chat/models/message.model';
import { Room } from 'src/chat/models/room.model';
import { UserRoom } from 'src/chat/models/user-room.model';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [SequelizeModule.forFeature([Message, Room, UserRoom])],
  exports: [UsersService],
})
export class UsersModule {}
