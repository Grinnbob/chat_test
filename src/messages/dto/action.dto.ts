import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MessageEventType } from 'src/utils/interfaces';

export class ActionDto {
  // @ApiProperty({
  //   example: MessageEventType.NEW_MESSAGE,
  //   description: 'event name',
  // })
  // @IsEnum(MessageEventType)
  // readonly eventName: MessageEventType;

  // @ApiProperty({
  //   example: 1,
  //   description: 'id',
  // })
  // @IsNumber()
  // @Min(1)
  // readonly userId: number;

  @ApiProperty({
    example: 1,
    description: 'id',
  })
  @IsNumber()
  @Min(1)
  readonly roomId: number;

  // @ApiProperty({
  //   example: '1',
  //   description: 'id',
  // })
  // @IsString({ message: 'Must be string' })
  // @IsOptional()
  // readonly socketId?: string;
}
