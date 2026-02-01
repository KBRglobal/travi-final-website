import type { Request, Response, NextFunction } from 'express';

export function foundationErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  next(err);
}
