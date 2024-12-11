import { createSortingDto } from 'src/utils/dto/query.dto';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

const availableSortingFields = [
  // 'likesCount',
  // 'viewsCount',
  // 'sharesCount',
  // 'commentsCount',
] as const;

export const RoomSortingDTO = createSortingDto(availableSortingFields);
export type RoomSortingDTO = InstanceType<typeof RoomSortingDTO>;

export class RoomFiltersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'String query param',
    type: String,
  })
  @Type(() => String)
  @IsString()
  @IsOptional()
  public includeText?: string;

  @ApiPropertyOptional({
    description: 'vacancyId',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  public vacancyId?: number;

  @ApiPropertyOptional({
    description: 'hireId',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  public hireId?: number;

  @ApiPropertyOptional({
    description: 'userId',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  public userId?: number;
}
