import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { createSortingDto } from 'src/utils/dto/query.dto';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';

const availableSortingFields = [
  // 'totalRating',
  // 'vacanciesCount',
  // 'employeesCount',
] as const;

export const CompanyEmployeesSortingDTO = createSortingDto(
  availableSortingFields,
);
export type CompanyEmployeesSortingDTO = InstanceType<
  typeof CompanyEmployeesSortingDTO
>;

export class CompanyEmployeesFiltersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'id',
    type: Number,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  public companyId: number;
}
