import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import {
  CreateUserDTO,
  createUserSchema,
  UpdateUserDTO,
  updateUserSchema,
  userParamsSchema,
} from '../schemas';

export class UsersHandler {
  private readonly userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  createUser(req: Request, res: Response) {
    const dto: CreateUserDTO = createUserSchema.parse(req.body);
    const user = this.userService.createUser(dto);
    res.status(201).send(user);
  }

  updateUser(req: Request, res: Response) {
    const dto: UpdateUserDTO = updateUserSchema.parse(req.body);
    const { user_id } = userParamsSchema.parse({ user_id: req.params.id });
    const user = this.userService.updateUser(dto, user_id);
    res.status(201).send(user);
  }

  getUser(req: Request, res: Response) {
    const { user_id } = userParamsSchema.parse({ user_id: req.params.id });
    const user = this.userService.getUser(user_id);
    res.status(200).send(user);
  }
}
