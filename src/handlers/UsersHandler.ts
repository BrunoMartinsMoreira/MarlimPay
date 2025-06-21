import { Request, Response } from 'express';
import {
  CreateUserDTO,
  createUserSchema,
  UpdateUserDTO,
  updateUserSchema,
  userParamsSchema,
} from '../schemas';
import { container, injectable } from 'tsyringe';
import { UserService } from '../services';

@injectable()
export class UsersHandler {
  private readonly userService = container.resolve(UserService);

  async createUser(req: Request, res: Response) {
    const dto: CreateUserDTO = createUserSchema.parse(req.body);
    const user = await this.userService.createUser(dto);
    res.status(201).send(user);
  }

  async updateUser(req: Request, res: Response) {
    const dto: UpdateUserDTO = updateUserSchema.parse(req.body);
    const { user_id } = userParamsSchema.parse({ user_id: req.params.user_id });
    const user = await this.userService.updateUser(dto, user_id);
    res.status(200).send(user);
  }

  async getUser(req: Request, res: Response) {
    const { user_id } = userParamsSchema.parse({ user_id: req.params.user_id });
    const user = await this.userService.findUser(user_id);
    res.status(200).send(user);
  }
}
