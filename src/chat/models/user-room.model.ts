import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from 'src/users/users.model';
import { Room } from './room.model';

interface UserRoomCreateAttrs {
  userId: number;
  roomId: number;
  socketId?: string | null;
}

@Table({ tableName: 'user_room' })
export class UserRoom extends Model<UserRoom, UserRoomCreateAttrs> {
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

  @BelongsTo(() => User, 'userId')
  user: User;

  @ForeignKey(() => Room)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  roomId: number;

  @BelongsTo(() => Room, 'roomId')
  room: Room;

  @Column({
    type: DataType.INTEGER,
    defaultValue: null,
  })
  lastReadMessageId?: number;

  @Column({
    type: DataType.STRING,
    defaultValue: null,
  })
  socketId?: string | null;
}
