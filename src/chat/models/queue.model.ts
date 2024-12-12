import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface QueueCreateAttrs {
  socketId: string;
  name?: string;
  participants?: number;
}

@Table({ tableName: 'queues' })
export class Queue extends Model<Queue, QueueCreateAttrs> {
  @Column({ allowNull: false })
  name: string;

  @Column({ allowNull: false, type: DataType.INTEGER })
  participants: number;

  @Column({ allowNull: false })
  socketId: string;
}
