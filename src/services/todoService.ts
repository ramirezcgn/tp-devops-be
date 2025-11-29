import toDoRepository from '../repositories/ToDoRepository';
import redis from '../config/redis';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { logWithTrace } from '../middlewares/logger.middleware';

const tracer = trace.getTracer('devops-be-service');

export class ToDoService {
  async get(id) {
    return tracer.startActiveSpan('TodoService.get', async (span) => {
      try {
        span.setAttribute('todo.id', id);
        logWithTrace('info', 'Fetching todo', { todoId: id });

        const cacheKey = `todo:${id}`;

        // Span para operación de Redis
        const cached = await tracer.startActiveSpan('Redis.get', async (redisSpan) => {
          redisSpan.setAttribute('redis.key', cacheKey);
          const result = await redis.get(cacheKey);
          redisSpan.setAttribute('redis.hit', !!result);
          logWithTrace('info', result ? 'Cache hit' : 'Cache miss', { cacheKey });
          redisSpan.end();
          return result;
        });

        if (cached) {
          span.setAttribute('cache.hit', true);
          span.end();
          return JSON.parse(cached);
        }

        span.setAttribute('cache.hit', false);
        const todo = await toDoRepository.get(id);

        if (todo) {
          await tracer.startActiveSpan('Redis.set', async (redisSpan) => {
            redisSpan.setAttribute('redis.key', cacheKey);
            redisSpan.setAttribute('redis.ttl', 300);
            await redis.set(cacheKey, JSON.stringify(todo), 'EX', 60 * 5);
            logWithTrace('info', 'Cached todo', { cacheKey, ttl: '5m' });
            redisSpan.end();
          });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return todo;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        logWithTrace('error', 'Error fetching todo', { todoId: id, error: error.message });
        span.end();
        throw error;
      }
    });
  }

  async getAll(page, limit) {
    return tracer.startActiveSpan('TodoService.getAll', async (span) => {
      try {
        span.setAttribute('pagination.page', page);
        span.setAttribute('pagination.limit', limit);
        logWithTrace('info', 'Fetching all todos', { page, limit });

        const cacheKey = `todos:all:${page}:${limit}`;

        const cached = await tracer.startActiveSpan('Redis.get', async (redisSpan) => {
          redisSpan.setAttribute('redis.key', cacheKey);
          const result = await redis.get(cacheKey);
          redisSpan.setAttribute('redis.hit', !!result);
          logWithTrace('info', result ? 'Cache hit' : 'Cache miss', { cacheKey });
          redisSpan.end();
          return result;
        });

        if (cached) {
          span.setAttribute('cache.hit', true);
          span.end();
          return JSON.parse(cached);
        }

        span.setAttribute('cache.hit', false);
        const todos = await toDoRepository.getAll(page, limit);

        await tracer.startActiveSpan('Redis.set', async (redisSpan) => {
          redisSpan.setAttribute('redis.key', cacheKey);
          redisSpan.setAttribute('redis.ttl', 60);
          await redis.set(cacheKey, JSON.stringify(todos), 'EX', 60);
          logWithTrace('info', 'Cached todos list', { cacheKey, ttl: '1m', count: todos.length });
          redisSpan.end();
        });

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return todos;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        logWithTrace('error', 'Error fetching todos', { page, limit, error: error.message });
        span.end();
        throw error;
      }
    });
  }

  async create(data) {
    return tracer.startActiveSpan('TodoService.create', async (span) => {
      try {
        span.setAttribute('todo.title', data.title);
        logWithTrace('info', 'Creating new todo', { title: data.title });

        const todo = await toDoRepository.create(data);
        await this.invalidateListCache();

        span.setAttribute('todo.id', todo.id);
        span.setStatus({ code: SpanStatusCode.OK });
        logWithTrace('info', 'Todo created successfully', { todoId: todo.id });
        span.end();
        return todo;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        logWithTrace('error', 'Error creating todo', { data, error: error.message });
        span.end();
        throw error;
      }
    });
  }

  async update(id, data) {
    return tracer.startActiveSpan('TodoService.update', async (span) => {
      try {
        span.setAttribute('todo.id', id);
        logWithTrace('info', 'Updating todo', { todoId: id });

        const todo = await toDoRepository.update(id, data);

        await tracer.startActiveSpan('Redis.del', async (redisSpan) => {
          const cacheKey = `todo:${id}`;
          redisSpan.setAttribute('redis.key', cacheKey);
          await redis.del(cacheKey);
          logWithTrace('info', 'Invalidated todo cache', { cacheKey });
          redisSpan.end();
        });

        await this.invalidateListCache();

        span.setStatus({ code: SpanStatusCode.OK });
        logWithTrace('info', 'Todo updated successfully', { todoId: id });
        span.end();
        return todo;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        logWithTrace('error', 'Error updating todo', { todoId: id, error: error.message });
        span.end();
        throw error;
      }
    });
  }

  async remove(id) {
    return tracer.startActiveSpan('TodoService.remove', async (span) => {
      try {
        span.setAttribute('todo.id', id);
        logWithTrace('info', 'Removing todo', { todoId: id });

        const result = await toDoRepository.remove(id);

        await tracer.startActiveSpan('Redis.del', async (redisSpan) => {
          const cacheKey = `todo:${id}`;
          redisSpan.setAttribute('redis.key', cacheKey);
          await redis.del(cacheKey);
          logWithTrace('info', 'Invalidated todo cache', { cacheKey });
          redisSpan.end();
        });

        await this.invalidateListCache();

        span.setStatus({ code: SpanStatusCode.OK });
        logWithTrace('info', 'Todo removed successfully', { todoId: id });
        span.end();
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        logWithTrace('error', 'Error removing todo', { todoId: id, error: error.message });
        span.end();
        throw error;
      }
    });
  }

  private async invalidateListCache() {
    return tracer.startActiveSpan('TodoService.invalidateListCache', async (span) => {
      try {
        const keys = await redis.keys('todos:all:*');
        span.setAttribute('cache.keys.count', keys.length);

        if (keys.length > 0) {
          await redis.del(...keys);
          logWithTrace('info', 'Invalidated list cache', { keysCount: keys.length });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        logWithTrace('error', 'Error invalidating cache', { error: error.message });
        span.end();
        throw error;
      }
    });
  }
}

export default new ToDoService();
