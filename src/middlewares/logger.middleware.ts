import pino from 'pino';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Configurar Pino para logs estructurados
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    service: 'devops-be',
    environment: process.env.NODE_ENV || 'development',
  },
});

// Middleware para logging estructurado con contexto de traza
export const loggingMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Obtener contexto de traza actual
  const span = trace.getSpan(context.active());
  const traceId = span?.spanContext().traceId;
  const spanId = span?.spanContext().spanId;

  // Log de request entrante
  logger.info({
    msg: 'Incoming request',
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.get('user-agent'),
      'content-type': req.get('content-type'),
    },
    traceId,
    spanId,
  });

  // Interceptar la respuesta
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log de response
    const logData = {
      msg: 'Request completed',
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      traceId,
      spanId,
    };

    if (statusCode >= 500) {
      logger.error(logData, 'Server error');
    } else if (statusCode >= 400) {
      logger.warn(logData, 'Client error');
    } else {
      logger.info(logData);
    }

    // Actualizar span con información de respuesta
    if (span) {
      span.setAttribute('http.status_code', statusCode);
      span.setAttribute('http.response_time_ms', duration);

      if (statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${statusCode}`,
        });
      }
    }

    return res.send(data);
  };

  next();
};

// Función helper para crear logs con contexto de traza
export function logWithTrace(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const span = trace.getSpan(context.active());
  const traceId = span?.spanContext().traceId;
  const spanId = span?.spanContext().spanId;

  logger[level]({
    msg: message,
    traceId,
    spanId,
    ...data,
  });
}

export default logger;
