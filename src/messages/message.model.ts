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
  documentName?: string;
  imageName?: string;
}

export enum DisplayType {
  pick_meeting_date = 'pick_meeting_date',
}

export type PickDateDisplay = {
  type: DisplayType.pick_meeting_date;
  payload: {
    scheduleId: number;
  };
};

export type MessageDisplay = PickDateDisplay;

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

  @ApiProperty({
    example: [{ type: 'text', value: 'test' }],
    description: 'Message json',
  })
  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  display: Array<MessageDisplay>;

  @ApiProperty({
    example: 'folder_id_uuid.ext',
    description: 'Image name',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  imageName?: string;

  @ApiProperty({
    example: 'folder_id_uuid.ext',
    description: 'Image name',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  documentName?: string;

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
