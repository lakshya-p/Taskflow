import { AppError } from "./AppError";

export const requestParam = (value: string | string[] | undefined, name: string): string => {
  const result = Array.isArray(value) ? value[0] : value;
  if (!result) throw new AppError(`Missing route parameter: ${name}`, 400);
  return result;
};
