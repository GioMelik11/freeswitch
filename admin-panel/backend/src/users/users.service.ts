import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findByUsername(username: string) {
    return this.repo.findOne({ where: { username } });
  }

  count() {
    return this.repo.count();
  }

  async create(params: {
    username: string;
    passwordHash: string;
    role: UserRole;
  }) {
    const user = this.repo.create(params);
    return await this.repo.save(user);
  }
}
