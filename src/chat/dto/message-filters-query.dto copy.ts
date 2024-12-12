import { createSortingDto } from 'src/utils/dto/query.dto';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const availableSortingFields = ['id'] as const;

export const MessageSortingDTO = createSortingDto(availableSortingFields);
export type MessageSortingDTO = InstanceType<typeof MessageSortingDTO>;

export class MessageFiltersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Room id',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public roomId: number;

  @ApiPropertyOptional({
    description: 'String query param',
    type: String,
  })
  @Type(() => String)
  @IsString()
  @IsOptional()
  public includeText?: string;

  @ApiPropertyOptional({
    description: 'Room id',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  public userId?: number;

  @ApiPropertyOptional({
    description: 'Room id',
    type: Number,
  })
  @IsOptional()
  @IsBoolean()
  public includeMeta?: boolean;
}
