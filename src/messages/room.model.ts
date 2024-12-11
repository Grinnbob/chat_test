import { ApiProperty } from '@nestjs/swagger';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  HasOne,
  Index,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from 'src/users/users.model';
import { UserRoom } from './user-room.model';
import { Message } from './message.model';
import { Hire } from 'src/vacancy/hire.model';

interface RoomCreateAttrs {
  hireId: number;
  hostId: number; // host userId
  name?: string;
  calendarEventId?: number;
}

@Table({ tableName: 'rooms' })
export class Room extends Model<Room, RoomCreateAttrs> {
  @ApiProperty({ example: 1, description: 'Unique ID' })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ApiProperty({ example: 'chat-123', description: 'Room name' })
  @Column({
    type: DataType.STRING,
    unique: false,
    allowNull: true,
  })
  name?: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  @Index
  hostId: number;

  @BelongsTo(() => User)
  host: User;

  @BelongsToMany(() => User, () => UserRoom)
  users: User[];

  @HasMany(() => UserRoom)
  userRooms: UserRoom[];

  @HasMany(() => Message)
  messages: Message[];

  @ForeignKey(() => Hire)
  @Column({ type: DataType.INTEGER })
  hireId?: number;

  @HasOne(() => Hire, 'roomId')
  hire?: Hire;
}
