import {
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  Query,
  Req,
  Scope,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthReq, JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles-guard';
import { MessageService } from './message.service';
import { Message } from './message.model';
import { IdDto } from 'src/utils/dto/id-query.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './room.model';
import {
  RoomFiltersQueryDto,
  RoomSortingDTO,
} from './dto/room-filters-query.dto';
import {
  MessageFiltersQueryDto,
  MessageSortingDTO,
} from './dto/message-filters-query.dto copy';
import { JwtAuthSoftGuard, SoftAuthReq } from 'src/auth/jwt-auth.soft-guard';

@ApiTags('Messages')
@Controller('messages')
@Injectable({ scope: Scope.REQUEST })
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @ApiOperation({ summary: 'Get messages' })
  @ApiResponse({ status: 200, type: Message })
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Get()
  async getPaginatedAll(
    @Query()
    query: MessageFiltersQueryDto,
    @Query() sorting: MessageSortingDTO,
    @Req() req: AuthReq,
  ) {
    return this.messageService.getPaginatedAll(query, sorting, req.user.id);
  }

  @ApiOperation({ summary: 'Find or create room' })
  @ApiResponse({ status: 200, type: Message })
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Post()
  async findOrCreateRoom(@Body() body: CreateRoomDto, @Req() req: AuthReq) {
    return this.messageService.findOrCreateRoom(body, req.user.id);
  }

  @ApiOperation({ summary: 'Get room' })
  @ApiResponse({ status: 200, type: Room })
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Get('room')
  async getRoom(@Query() query: IdDto) {
    return this.messageService.getRoom(query.id);
  }

  @ApiOperation({ summary: 'Get unreadMessagesCount' })
  @ApiResponse({ status: 200, type: Room })
  @UseGuards(JwtAuthSoftGuard)
  @Get('unreadMessagesCount')
  async getUnreadMessagesCount(@Req() req: SoftAuthReq) {
    return this.messageService.getUnreadMessagesCount(req.user?.id);
  }

  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, type: [Room] })
  @UseGuards(RolesGuard, JwtAuthGuard)
  @Get('rooms')
  async getPaginatedAllRooms(
    @Req() req: AuthReq,
    @Query()
    query: RoomFiltersQueryDto,
    @Query() sorting: RoomSortingDTO,
  ) {
    return this.messageService.getPaginatedAllRooms(
      query,
      sorting,
      req.user.id,
    );
  }
}
