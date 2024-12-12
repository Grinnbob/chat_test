import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './users.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userRepository: typeof User,
  ) {}

  public async findOrCreateUser(
    email: string,
    firstName: string,
  ): Promise<User> {
    // Check if a user with the given email exists
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // If not found, create a new user
      user = await this.userRepository.create({ email, firstName });
    }

    return user;
  }
}
