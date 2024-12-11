import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CandidateStatus, UserGender } from '../users.model';

export class AddInfoToUserDto {
  @ApiProperty({ example: 'Grig', description: 'User name' })
  @IsString({ message: 'Must be string' })
  readonly firstName: string;

  @ApiProperty({ example: 'Pol', description: 'User sername' })
  @IsString({ message: 'Must be string' })
  readonly lastName: string;

  @ApiProperty({ example: 'Alexovich', description: 'User middleName' })
  @IsString({ message: 'Must be string' })
  @IsOptional()
  readonly middleName: string;

  // @ApiProperty({ example: '+7 999 000 88 77', description: 'User phone' })
  // @IsString({ message: 'Must be string' })
  // @Length(10, 20, { message: 'Length must be between 10 and 20' })
  // readonly phone?: string;

  @ApiProperty({
    example: 'My department of recruitment',
    description: 'Recruiter department in organization',
  })
  @IsString({ message: 'Must be string' })
  @IsOptional()
  readonly department: string;

  @ApiProperty({ example: 'Moscow', description: 'User location' })
  @IsString({ message: 'Must be string' })
  @IsOptional()
  readonly location: string;

  @ApiProperty({ example: UserGender.MALE, description: 'User gender' })
  @IsEnum(UserGender)
  readonly gender: UserGender;

  @ApiProperty({ example: new Date(), description: 'User birthDate' })
  @IsDate()
  readonly birthDate: Date;

  @ApiProperty({
    example: 'Recruiter =)',
    description: 'User status',
  })
  @IsOptional()
  @IsString({ message: 'Must be string' })
  readonly status?: string;

  @ApiProperty({
    example: CandidateStatus.ACTIVELY_CONSIDERING_OFFERS,
    description: 'Candidate status',
  })
  @IsOptional()
  @IsEnum(CandidateStatus)
  readonly candidateStatus?: CandidateStatus;

  @IsNumber({}, { message: 'Must be a number' })
  @IsOptional()
  readonly languageId?: number;
}
