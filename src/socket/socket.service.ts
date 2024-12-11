import {
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { CreateMessageDto } from 'src/messages/dto/create-message.dto';
import { ReadMessageDto } from 'src/messages/dto/read-message.dto';
import { Message } from 'src/messages/message.model';
import { MessageService } from 'src/messages/message.service';
import { Room } from 'src/messages/room.model';
import { UserRoom } from 'src/messages/user-room.model';
import { Notification } from 'src/notifications/notifications.model';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UsersService } from 'src/users/users.service';
import { VacancyService } from 'src/vacancy/vacancy.service';

@Injectable()
export class SocketService {
  constructor(
    @InjectModel(Room)
    private readonly roomRepository: typeof Room,
    private readonly messageService: MessageService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => VacancyService))
    private readonly vacancyService: VacancyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  public async createMessage(
    message: CreateMessageDto & Required<Pick<CreateMessageDto, 'roomId'>>,
    userId: number,
  ): Promise<Message> {
    return await this.messageService.create({
      text: message.text,
      roomId: message.roomId,
      display: message.display,
      userId,
    });
  }

  public async createMessageByHireId(
    message: CreateMessageDto & Required<Pick<CreateMessageDto, 'hireId'>>,
    userId: number,
  ) {
    const hire = await this.vacancyService.getVacancyWithRoom(
      message.hireId,
      userId,
    );

    if (!hire) throw new ConflictException(); // vacancy not found

    if (hire.vacancy) {
      return await this.createMessage(
        {
          ...message,
          roomId: hire.room.id,
        },
        userId,
      );
    }

    return await this.messageService.createMessageWithRoom(
      {
        ...message,
        userId,
      },
      userId,
    );
  }

  public async createMessageByUserId(
    message: CreateMessageDto & Required<Pick<CreateMessageDto, 'userId'>>,
    userId: number,
  ) {
    const rooms = await this.roomRepository.findAll({
      include: [
        {
          model: UserRoom,
          where: {
            userId: {
              [Op.in]: [userId, message.userId],
            },
          },
          required: true,
        },
      ],
    });

    const room = rooms.find((room) => room.userRooms.length === 2);

    if (room) {
      return await this.createMessage(
        {
          ...message,
          roomId: room.id,
        },
        userId,
      );
    }

    return await this.messageService.createMessageWithRoom(message, userId);
  }

  public async joinRoom(
    roomId: any,
    userId: number,
    socketId: string,
  ): Promise<boolean> {
    roomId = Number(roomId);
    await this.messageService.addUserToRoom(roomId, userId, socketId);
    return true;
  }

  public async addUserToAllRooms(
    socketId: string,
    userId: number,
  ): Promise<string[]> {
    return this.messageService.addUserToAllRooms(socketId, userId);
  }

  public async removeUserFromAllRooms(socketId: string): Promise<boolean> {
    await this.messageService.removeUserFromAllRooms(socketId);
    return true;
  }

  public async updateUserActivity(userId: number) {
    await this.usersService.updateUserActivity(userId);
    return true;
  }

  public async readMessage(userId: number, data: ReadMessageDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, affected] = await this.messageService.readMessage(userId, data);
    return affected[0];
  }

  public async readNotification(
    userId: number,
    notificationId?: number,
  ): Promise<Notification> {
    return await this.notificationsService.readNotification(
      userId,
      notificationId,
    );
  }
}
