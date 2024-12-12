import { ApiProperty } from '@nestjs/swagger';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from 'src/users/users.model';
import { Room } from './room.model';

interface MessageCreateAttrs {
  userId: number;
  roomId: number;
  text?: string;
}

@Table({ tableName: 'messages' })
export class Message extends Model<Message, MessageCreateAttrs> {
  @ApiProperty({ example: 1, description: 'Unique ID' })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ApiProperty({ example: 'Hello there!', description: 'Message body' })
  @Column({
    type: DataType.TEXT,
    unique: false,
    allowNull: true,
  })
  text: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  @Index
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Room)
  @Column({ type: DataType.INTEGER })
  @Index
  roomId: number;

  @BelongsTo(() => Room)
  room: Room;
}
