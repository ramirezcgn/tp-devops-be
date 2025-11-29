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

// Cache metrics
export const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key_pattern'],
});

export const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key_pattern'],
});

// Database metrics
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

export const dbQueriesTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'status'],
});

// Stress test metrics
export const stressTestsTotal = new promClient.Counter({
  name: 'stress_tests_total',
  help: 'Total number of stress tests executed',
  labelNames: ['type'],
});

export const stressTestDuration = new promClient.Histogram({
  name: 'stress_test_duration_seconds',
  help: 'Duration of stress tests in seconds',
  labelNames: ['type'],
  buckets: [1, 3, 5, 10, 30],
});

// Memory metrics
export const heapUsed = new promClient.Gauge({
  name: 'nodejs_heap_used_bytes',
  help: 'Heap used in bytes',
});

export const heapTotal = new promClient.Gauge({
  name: 'nodejs_heap_total_bytes',
  help: 'Total heap size in bytes',
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(todosTotal);
register.registerMetric(activeTodos);
register.registerMetric(completedTodos);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueriesTotal);
register.registerMetric(stressTestsTotal);
register.registerMetric(stressTestDuration);
register.registerMetric(heapUsed);
register.registerMetric(heapTotal);

// Update memory metrics every 10 seconds
setInterval(() => {
  const memUsage = process.memoryUsage();
  heapUsed.set(memUsage.heapUsed);
  heapTotal.set(memUsage.heapTotal);
}, 10000);

// Function to update todos metrics
export async function updateTodosMetrics() {
  try {
    const { default: toDoRepository } = await import('../repositories/ToDoRepository.js');
    const allTodos = await toDoRepository.getAll(0, 1000); // page=0, Get up to 1000 todos

    const totalCount = allTodos.length;
    const activeCount = allTodos.filter((todo: any) => !todo.completed).length;
    const completedCount = allTodos.filter((todo: any) => todo.completed).length;

    todosTotal.set(totalCount);
    activeTodos.set(activeCount);
    completedTodos.set(completedCount);
  } catch (error) {
    console.error('Error updating todos metrics:', error);
  }
}

// Update todos metrics every 10 seconds
setInterval(updateTodosMetrics, 10000);

// Initial update
setTimeout(updateTodosMetrics, 5000); // Wait 5 seconds for app to initialize
