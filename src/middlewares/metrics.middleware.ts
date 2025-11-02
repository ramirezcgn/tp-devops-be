import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../config/metrics';

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration,
    );

    httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
  });

  next();
};
