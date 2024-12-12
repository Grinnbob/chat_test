import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: '1',
    description: 'id',
  })
  @IsString({ message: 'Must be string' })
  @IsOptional()
  text: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @IsArray()
  display?: Array<object>;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @IsInt()
  hireId?: number;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  roomId?: number;
}
