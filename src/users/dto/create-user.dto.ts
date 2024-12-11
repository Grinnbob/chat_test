import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'User email' })
  @IsString({ message: 'Must be string' })
  @IsEmail({}, { message: 'Incorrect email' })
  readonly email: string;

  @ApiProperty({ example: '12345678', description: 'User password' })
  @IsString({ message: 'Must be string' })
  @Length(8, 30, { message: 'Length must be between 8 and 30' })
  readonly password: string;

  @ApiProperty({ example: 'RECRUITER', description: 'User role' })
  @IsOptional()
  readonly role: string;

  @ApiProperty({
    example: 'Agency',
    description: 'Recruiter type',
  })
  @IsOptional()
  @IsString({ message: 'Must be string' })
  readonly recruiterType?: string;

  @ApiProperty({
    example: true,
    description: 'Is user account info visible for others?',
  })
  @IsOptional()
  @IsBoolean()
  readonly isVisible?: boolean;
}
