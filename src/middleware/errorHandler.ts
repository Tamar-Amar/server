// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';

  res.status(statusCode).json({
    message: errorMessage,
    stack: process.env.NODE_ENV === 'production' ? null : err,
  });
};

export default errorHandler;
