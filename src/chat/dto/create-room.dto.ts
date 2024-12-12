import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    example: 'Kekovskaya',
    description: 'room name',
  })
  @IsString({ message: 'Must be string' })
  @IsOptional()
  public readonly name?: string;

  @ApiProperty({
    description: 'id',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  public readonly hireId?: number;
}
