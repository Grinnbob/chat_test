import {
  BadRequestException,
  Body,
  Controller,
  Injectable,
  Post,
  Query,
  Scope,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Chats')
@Controller('chats')
@Injectable({ scope: Scope.REQUEST })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/join')
  async joinChat(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('requestedMembers') requestedMembers: number,
    @Query('socketId') socketId: string,
  ): Promise<{ roomId: string } | { message: string }> {
    if (!email || !name || !requestedMembers || !socketId) {
      throw new BadRequestException(
        'All fields are required: email, name, requestedMembers, socketId',
      );
    }

    return this.chatService.joinRoom(email, name, requestedMembers, socketId);
  }
}
