import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { InjectModel } from '@nestjs/sequelize';
import { Queue } from './models/queue.model'; // A model for user queue
import { Room } from './models/room.model'; // A model for chat rooms
import { Message } from './models/message.model'; // A model for messages
import { User } from 'src/users/users.model';
import { Op } from 'sequelize';

@Injectable()
export class ChatService {
  private server: Server;

  constructor(
    @InjectModel(Queue) private queueModel: typeof Queue,
    @InjectModel(Room) private roomModel: typeof Room,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Message) private messageModel: typeof Message,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  async joinQueue(
    name: string,
    participants: number,
    socketId: string,
  ): Promise<void> {
    // Add user to the queue
    await this.queueModel.create({ name, participants, socketId });
    await this.matchQueue(participants);
  }

  private async matchQueue(participants: number): Promise<void> {
    // Find users in queue matching the required participant count
    const usersInQueue = await this.queueModel.findAll({
      limit: participants,
      order: [['createdAt', 'ASC']],
    });

    if (usersInQueue.length === participants) {
      // Create a new chat room
      const room = await this.roomModel.create();

      // Associate users with the room
      const participantIds: string[] = [];
      for (const user of usersInQueue) {
        const foundUser = await this.userModel.findByPk(user.id);
        if (foundUser) {
          await room.$add('users', foundUser);
          participantIds.push(user.socketId);
        }
        await this.queueModel.destroy({ where: { id: user.id } });
      }

      const roomId = room.id;

      // Notify all users
      participantIds.forEach((socketId) => {
        this.notifyUser(socketId, roomId);
      });
    }
  }

  private async notifyUser(socketId: string, roomId: number): Promise<void> {
    // Notify user about the created room
    this.server.to(socketId).emit('roomAssigned', { roomId: `${roomId}` });
  }

  async sendMessage(
    roomId: string,
    userId: string,
    text: string,
  ): Promise<void> {
    // Save the message to the database
    const savedMessage = await this.messageModel.create({
      roomId: parseInt(roomId),
      userId: parseInt(userId),
      text,
    });

    // Fetch the room and its participants
    const room = await this.roomModel.findByPk(roomId, { include: [User] });

    if (room) {
      // Find socket IDs for all participants in the room
      const queueEntries = await this.queueModel.findAll({
        where: {
          id: {
            [Op.in]: room.users.map((user) => user.id),
          },
        },
      });

      // Notify participants in the room about the new message
      queueEntries.forEach((entry) => {
        this.server.to(entry.socketId).emit('newMessage', {
          userId: savedMessage.userId,
          text: savedMessage.text,
          createdAt: savedMessage.createdAt,
        });
      });
    }
  }

  async getRoomHistory(roomId: string): Promise<any[]> {
    // Retrieve message history for a specific room
    const messages = await this.messageModel.findAll({
      where: { roomId },
      order: [['createdAt', 'ASC']],
    });
    return messages.map((msg) => ({
      userId: msg.userId,
      text: msg.text,
      createdAt: msg.createdAt,
    }));
  }

  // async handleTyping(roomId: string, senderId: string): Promise<void> {
  //   // Notify all participants in the room that a user is typing
  //   const room = await this.roomModel.findByPk(roomId, { include: [User] });
  //   if (room) {
  //     room.users.forEach((user) => {
  //       this.server.to(user.socketId).emit('userTyping', { senderId });
  //     });
  //   }
  // }
}
