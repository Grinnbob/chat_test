import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Index,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from 'src/users/users.model';
import { UserRoom } from './user-room.model';
import { Message } from './message.model';

interface RoomCreateAttrs {
  hostId: number; // host userId
  name?: string;
}

@Table({ tableName: 'rooms' })
export class Room extends Model<Room, RoomCreateAttrs> {
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

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
}
