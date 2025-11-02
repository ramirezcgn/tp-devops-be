import promClient from 'prom-client';

// Create a Registry
export const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const todosTotal = new promClient.Gauge({
  name: 'todos_total',
  help: 'Total number of todos in database',
});

export const activeTodos = new promClient.Gauge({
  name: 'todos_active',
  help: 'Number of active (incomplete) todos',
});

export const completedTodos = new promClient.Gauge({
  name: 'todos_completed',
  help: 'Number of completed todos',
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(todosTotal);
register.registerMetric(activeTodos);
register.registerMetric(completedTodos);
