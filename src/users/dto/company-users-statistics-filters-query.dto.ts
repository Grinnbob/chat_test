import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, Min } from 'class-validator';
import { createSortingDto } from 'src/utils/dto/query.dto';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';

const availableSortingFields = [
  // 'vacanciesCount',
] as const;

export const CompanyUsersStatisticsSortingDTO = createSortingDto(
  availableSortingFields,
);
export type CompanyUsersStatisticsSortingDTO = InstanceType<
  typeof CompanyUsersStatisticsSortingDTO
>;

export class CompanyUsersStatisticsFiltersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'id',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public companyId: number;

  @ApiPropertyOptional({ example: new Date(), description: 'start date' })
  @IsDate()
  @IsOptional()
  readonly startDate?: Date | null;

  @ApiPropertyOptional({ example: new Date(), description: 'end date' })
  @IsDate()
  @IsOptional()
  readonly endDate?: Date | null;
}
