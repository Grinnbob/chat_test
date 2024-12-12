import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { ActionDto } from './action.dto';

export class KickUserDto extends ActionDto {
  @ApiProperty({
    example: 1,
    description: 'id',
  })
  @IsNumber()
  @Min(1)
  readonly kickUserId: number;
}
