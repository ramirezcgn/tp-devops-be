import toDoRepository from '../repositories/ToDoRepository';
import redis from '../config/redis';

export class ToDoService {
  async get(id) {
    const cacheKey = `todo:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const todo = await toDoRepository.get(id);
    if (todo) {
      await redis.set(cacheKey, JSON.stringify(todo), 'EX', 60 * 5);
    }
    return todo;
  }

  async getAll(page, limit) {
    const cacheKey = `todos:all:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const todos = await toDoRepository.getAll(page, limit);
    await redis.set(cacheKey, JSON.stringify(todos), 'EX', 60);
    return todos;
  }

  async create(data) {
    const todo = await toDoRepository.create(data);
    await this.invalidateListCache();
    return todo;
  }

  async update(id, data) {
    const todo = await toDoRepository.update(id, data);
    await redis.del(`todo:${id}`);
    await this.invalidateListCache();
    return todo;
  }

  async remove(id) {
    const result = await toDoRepository.remove(id);
    await redis.del(`todo:${id}`);
    await this.invalidateListCache();
    return result;
  }

  private async invalidateListCache() {
    const keys = await redis.keys('todos:all:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export default new ToDoService();
