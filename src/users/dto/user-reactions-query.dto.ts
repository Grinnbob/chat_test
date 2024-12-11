import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/utils/dto/pagination-query.dto';

export class UserReactionsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'Something',
    description: 'String query param',
    type: String,
  })
  @Type(() => String)
  @IsString()
  public readonly model: string;

  @ApiProperty({
    example: 'Something',
    description: 'String query param',
    type: String,
  })
  @Type(() => String)
  @IsString()
  public readonly reactionType: string;
}
