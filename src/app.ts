import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
//import auth from './policies/auth.policy';
import todoRoutes from './routes/todo.routes';
import stressRoutes from './routes/stress.routes';
import { register } from './config/metrics';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import { loggingMiddleware, logger } from './middlewares/logger.middleware';

// create express app
const app = express();

// allow cross origin requests
// configure to only allow requests from certain origins
app.use(cors());

// Add logging middleware FIRST (before other middlewares)
app.use(loggingMiddleware);

// Add metrics middleware (before other middlewares)
app.use(metricsMiddleware);

// Add custom headers to identify pod
app.use((req, res, next) => {
  const podName = process.env.HOSTNAME || 'unknown-pod';
  res.setHeader('X-Pod-Name', podName);
  res.setHeader('X-Served-By', `pod-${podName}`);
  next();
});

// secure express app
app.use(
  helmet({
    dnsPrefetchControl: false,
    frameguard: false,
    ieNoOpen: false,
  }),
);

// parsing the request body
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// secure your private routes with jwt authentication middleware
// app.all('/api/admin/*', (req, res, next) => auth(req, res, next));

const sendResponse = (res, statusCode, response) => {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(response);
  } else if (res.end) {
    res.end(JSON.stringify(response));
  }
};

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
});

// endpoint path to monitor the service
app.get('/health', (req, res) => {
  sendResponse(res, 200, { status: 'ok' });
});

// fill routes for express application
app.use('/api/todos', todoRoutes);
app.use('/api/stress', stressRoutes);

// Manejo global de errores
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    //next: express.NextFunction,
  ) => {
    // Log estructurado del error
    logger.error({
      err,
      method: req.method,
      url: req.url,
      statusCode: err.status || 500,
      msg: 'Request error',
    });

    sendResponse(res, err.status || 500, {
      error: {
        message: err.message || 'Internal Server Error',
        details: err.details || undefined,
      },
    });
  },
);

// export express app
export default app;
