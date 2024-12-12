import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { ActionDto } from './action.dto';

export class ReadMessageDto extends ActionDto {
  @ApiProperty({
    example: 1,
    description: 'id',
  })
  @IsNumber()
  @Min(1)
  readonly lastReadMessageId: number;
}
