import { AppError } from "../../utils/AppError";
import { usersRepository } from "./users.repository";

export const usersService = {
  async get(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  async updateMe(id: string, input: { name?: string; email?: string }) {
    if (input.email) {
      const existing = await usersRepository.findByEmail(input.email);
      if (existing && existing.id !== id) throw new AppError("Email is already in use", 409);
    }
    return usersRepository.update(id, input);
  }
};
