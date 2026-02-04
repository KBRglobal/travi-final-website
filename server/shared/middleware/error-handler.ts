import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export function foundationErrorHandler(): ErrorRequestHandler {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    next(err);
  };
}
