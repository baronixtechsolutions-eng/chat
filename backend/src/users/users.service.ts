import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { User } from './user.entity.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  create(data: Pick<User, 'name' | 'email' | 'passwordHash'>) {
    return this.users.save(this.users.create(data));
  }

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  findByEmailWithPassword(email: string) {
    return this.users.findOne({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
  }

  listExcept(userId: string) {
    return this.users.find({
      where: { id: Not(userId) },
      order: { name: 'ASC' },
    });
  }

  countByIds(ids: string[]) {
    return this.users.countBy({ id: In(ids) });
  }
}
