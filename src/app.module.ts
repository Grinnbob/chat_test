import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from './users/users.module';
import { MessageModule } from './messages/message.module';
import { SocketModule } from './socket/socket.module';
import * as dbConfig from './database/config.json';
import { Message } from './messages/message.model';
import { Room } from './messages/room.model';
import { UserRoom } from './messages/user-room.model';
import { User } from './users/users.model';

@Module({
  imports: [
    UsersModule,
    MessageModule,
    SocketModule,
    SequelizeModule.forRoot({
      dialect: dbConfig[process.env.NODE_ENV].dialect,
      host: dbConfig[process.env.NODE_ENV].host,
      port: dbConfig[process.env.NODE_ENV].port,
      username: dbConfig[process.env.NODE_ENV].username,
      password: dbConfig[process.env.NODE_ENV].password,
      database: dbConfig[process.env.NODE_ENV].database,
      logQueryParameters: process.env.NODE_ENV === 'dev',
      logging: false,
      models: [User, Message, Room, UserRoom],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
