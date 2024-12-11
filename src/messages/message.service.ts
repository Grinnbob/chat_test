import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DisplayType, Message } from './message.model';
import { LoggerService } from 'src/logger/logger.service';
import { Room } from './room.model';
import { UserRoom } from './user-room.model';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ReadMessageDto } from './dto/read-message.dto';
import { User } from 'src/users/users.model';
import {
  getInfoPagination,
  getPGWordsListQueryForSearch,
  maskSensitivePersonalData,
  paginate,
} from 'src/utils/utils';
import {
  RoomFiltersQueryDto,
  RoomSortingDTO,
} from './dto/room-filters-query.dto';
import {
  MessageFiltersQueryDto,
  MessageSortingDTO,
} from './dto/message-filters-query.dto copy';
import {
  extendWhereConditionWithAnd,
  mapQueryToOrderConditionMessage,
  mapQueryToOrderConditionRoom,
} from 'src/utils/queryToDbRequest';
import { PaginatedResponse } from 'src/utils/interfaces';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import { Vacancy } from 'src/vacancy/vacancy.model';
import { Company } from 'src/company/company.model';
import { Hire } from 'src/vacancy/hire.model';
import { Industry } from 'src/industry/industry.model';
import { City } from 'src/city/city.model';
import { Contact } from 'src/contacts/contacts.model';
import { SocketGateway } from 'src/socket/socket.gateway';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message)
    private readonly messageRepository: typeof Message,
    @InjectModel(Room)
    private readonly roomRepository: typeof Room,
    @InjectModel(UserRoom)
    private readonly userRoomRepository: typeof UserRoom,
    private readonly logger: LoggerService,
  ) {}

  public async addEventId(messageId: number, eventId: number) {
    const message = await this.messageRepository.findByPk(messageId);
    if (message && message.display) {
      message.display = message.display.map((display) => {
        if (display.type === DisplayType.pick_meeting_date) {
          return { ...display, payload: { ...display.payload, eventId } };
        }
        return display;
      });
      await message.save();
      return message;
    }
    return null;
  }

  public async createMessageWithRoom(
    message: CreateMessageDto & Required<Pick<CreateMessageDto, 'userId'>>,
    hostId: number,
  ): Promise<Room> {
    const room = await this.roomRepository.create(
      {
        hostId,
        //@ts-expect-error
        userRooms: [{ userId: hostId }, { userId: message.userId }],
        messages: [{ text: message.text, userId: hostId }],
      },
      {
        include: [Message, UserRoom],
        returning: true,
      },
    );

    //@ts-expect-error
    room.dataValues.users = await room.getUsers({
      where: {
        id: {
          [Op.ne]: hostId,
        },
      },
      attributes: [
        'firstName',
        'lastName',
        'email',
        'id',
        'email',
        'emailValidated',
      ],
    });

    return room;
  }

  public async create(
    message: CreateMessageDto & Required<Pick<CreateMessageDto, 'userId'>>,
    transactionHost?: { transaction: any },
  ): Promise<Message> {
    return await this.messageRepository.create(message, { ...transactionHost });
  }

  public async getPaginatedAll(
    query: MessageFiltersQueryDto,
    sorting: MessageSortingDTO = {},
    userId: number,
  ): Promise<PaginatedResponse<Message> & { room?: Room }> {
    const pageSize = query.pageSize ? query.pageSize : 10;
    const orderCondition = mapQueryToOrderConditionMessage(
      sorting.sort,
      query.includeText,
    );

    const whereCondition = {
      roomId: query.roomId,
    } as any;
    if (query.userId) whereCondition.userId = query.userId;

    const [{ count, rows: messages }, room] = await Promise.all([
      this.messageRepository.findAndCountAll({
        where: whereCondition,
        ...paginate(query.page, pageSize),
        order: orderCondition,
      }),
      this.roomRepository.findOne({
        where: { id: query.roomId },
        include: [UserRoom, { model: Hire, include: [{ model: Vacancy }] }],
      }),
    ]);

    const canHaveRights = room.userRooms?.find(
      (userRoom) => userRoom.userId === userId,
    );

    if (!canHaveRights) {
      throw new NotFoundException(`room not found!`);
    }

    return {
      room: query.includeMeta ? room : undefined,
      results: messages,
      ...getInfoPagination(query.page, pageSize, count),
    };
  }

  public async findOrCreateRoom(
    dto: CreateRoomDto,
    hostId: number,
    transactionHost?: { transaction: any },
  ): Promise<Room> {
    const [room] = await this.roomRepository.findOrCreate({
      where: { ...dto, hostId },
      ...transactionHost,
    });
    return room;
  }

  public async createHireRoomWithUsers(
    dto: CreateRoomDto,
    hostId: number,
    userId: number,
    transactionHost?: { transaction: any },
  ): Promise<Room> {
    const room = await this.findOrCreateRoom(dto, hostId, transactionHost);
    await this.userRoomRepository.upsert(
      {
        roomId: room.id,
        userId: hostId,
      },
      transactionHost,
    );
    await this.userRoomRepository.upsert(
      {
        roomId: room.id,
        userId,
      },
      transactionHost,
    );

    return room;
  }

  public async addUserToRoom(
    roomId: number,
    userId: number,
    socketId?: string,
    transactionHost?: { transaction: any },
  ): Promise<Room> {
    const room = await this.roomRepository.findByPk(roomId);
    if (!room) {
      throw new HttpException(`Room not found!`, HttpStatus.NOT_FOUND);
    }
    // const user = await this.usersService.findByPk(userId);
    // if (!user) {}

    await this.userRoomRepository.upsert(
      {
        roomId,
        userId,
        socketId,
      },
      transactionHost,
    );

    return room;
  }

  public async addUserToAllRooms(
    socketId: string,
    userId: number,
  ): Promise<string[]> {
    await this.userRoomRepository.update(
      { socketId },
      {
        where: { userId },
        //  returning: true
      },
    );
    const userRooms = await this.userRoomRepository.findAll({
      where: { userId },
    });
    return userRooms.map((room) => `${room.roomId}`);
    // return result[1][0];
  }

  public async removeUserFromAllRooms(socketId: string): Promise<boolean> {
    await this.userRoomRepository.update(
      { socketId: null },
      { where: { socketId } },
    );

    return true;
  }

  public async readMessage(userId: number, data: ReadMessageDto) {
    return await this.userRoomRepository.update(
      { lastReadMessageId: data.lastReadMessageId },
      {
        where: {
          userId,
          roomId: data.roomId,
          lastReadMessageId: {
            [Op.or]: {
              [Op.lt]: data.lastReadMessageId,
              [Op.eq]: null,
            },
          },
        },
        returning: true,
      },
    );
  }

  public async getRoom(roomId: number): Promise<Room> {
    return await this.roomRepository.findByPk(roomId);
  }

  public async getUnreadMessagesCount(userId?: number): Promise<string> {
    if (!userId) return '0';
    const unreadMessagesCount: any = await this.roomRepository.sequelize.query(
      `
          SELECT COUNT(*)
          FROM messages m 
          left outer join rooms r on r.id = m."roomId" 
          left outer join user_room ur on ur."roomId" = r.id 
          where (select "createdAt" from messages m  
          where ur."lastReadMessageId" = m.id and ur."userId" = ${userId}) <
          m."createdAt"
        `,
      {
        nest: true,
        plain: false,
        type: QueryTypes.SELECT,
      },
    );

    return unreadMessagesCount;
  }

  public async getPaginatedAllRooms(
    query: RoomFiltersQueryDto,
    sorting: RoomSortingDTO = {},
    userId: number,
  ): Promise<PaginatedResponse<Room>> {
    const pageSize = query.pageSize ? query.pageSize : 10;

    const orderCondition = mapQueryToOrderConditionRoom(
      sorting.sort,
      query.includeText,
    );

    let whereCondition: any;
    let whereConditionVacancy: any;
    let whereConditionHire: any;
    let whereConditionUser: any = { id: { [Op.ne]: userId } };

    if (query.includeText) {
      const includeWordsList = getPGWordsListQueryForSearch(query.includeText);

      if (includeWordsList?.length) {
        const condition = {
          [Op.iLike]: {
            [Op.all]: includeWordsList,
          },
        };

        whereCondition = {
          name: condition,
        };
      }
    }

    if (query.vacancyId)
      whereConditionVacancy = {
        id: query.vacancyId,
      };

    if (query.hireId)
      whereConditionHire = {
        id: query.hireId,
      };

    if (query.userId) {
      const andCondition = {
        id: query.userId,
      };
      whereConditionUser = extendWhereConditionWithAnd(
        whereConditionUser,
        andCondition,
      );
    }

    const { count, rows: rooms } = await this.roomRepository.findAndCountAll({
      where: whereCondition,
      ...paginate(query.page, pageSize),
      include: [
        {
          model: UserRoom,
          where: {
            userId,
          },
          required: true,
        },
        { model: Message, as: 'messages', attributes: ['createdAt'] }, // for order condition
        {
          model: User,
          as: 'users',
          where: whereConditionUser, // to get companion
          include: [Contact],
        },
        {
          model: Hire,
          required: query.vacancyId || query.hireId ? true : false,
          where: whereConditionHire,
          include: [
            {
              model: Vacancy,
              required: true,
              where: whereConditionVacancy,
              attributes: ['title', 'companyId'],
              include: [
                {
                  model: Company,
                  attributes: [
                    'id',
                    'name',
                    'isVerified',
                    'imageName',
                    'website',
                    'cityId',
                    [
                      Sequelize.literal(`(
                              SELECT AVG(cr.rating)
                              FROM companies AS c
                              LEFT OUTER JOIN company_ratings cr ON c.id = cr."companyId"
                              GROUP BY c.id
                              HAVING c.id = "hire->vacancy->company".id
                          )`),
                      'rating',
                    ],
                    [
                      Sequelize.literal(`(
                            SELECT COUNT(v.id)
                            FROM companies c 
                            LEFT OUTER JOIN vacancies v ON v."companyId" = c.id 
                            WHERE v."isActive" = true
                            GROUP BY c.id
                            HAVING c.id = "hire->vacancy->company".id
                        )`),
                      'vacanciesCount',
                    ],
                  ],
                  include: [
                    {
                      model: Industry,
                      attributes: ['title'],
                    },
                    { model: City },
                  ],
                },
              ],
            },
          ],
        },
      ],
      attributes: {
        include: [
          [
            Sequelize.literal(`(
                SELECT COUNT(*)
                FROM messages m 
                left outer join rooms r on r.id = m."roomId" 
                left outer join user_room ur on ur."roomId" = r.id 
                where (select "createdAt" from messages m  
                where ur."lastReadMessageId" = m.id and ur."userId" = ${userId}) <
                m."createdAt" and r.id = "Room".id
            )`),
            'unreadMessagesCount',
          ],
          [
            Sequelize.literal(`(
                SELECT max(m."createdAt") from messages m 
                left outer join rooms r on r.id = m."roomId" 
                left outer join user_room ur on ur."roomId" = r.id 
                where ur."userId" = ${userId} and r.id = "Room".id
            )`),
            'lastMessageTimestamp',
          ],
        ],
      },
      order: orderCondition,
    });

    return {
      results: rooms.map((room) => {
        delete room.userRooms;
        delete room.messages;
        room.users = room.users.map((user) => maskSensitivePersonalData(user));
        return room;
      }),
      ...getInfoPagination(query.page, pageSize, count),
    };
  }
}
