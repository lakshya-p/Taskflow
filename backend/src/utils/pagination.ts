export type PaginationInput = {
  page?: string | number;
  limit?: string | number;
};

export const getPagination = ({ page = 1, limit = 10 }: PaginationInput) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const perPage = Math.min(Math.max(Number(limit) || 10, 1), 100);
  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage,
    take: perPage
  };
};

export const paginateResult = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
});
