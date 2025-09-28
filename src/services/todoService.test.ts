import todoRepository from '../repositories/ToDoRepository';
import todoService from './todoService';
import redis from '../config/redis';

jest.mock('../repositories/ToDoRepository');
jest.mock('../config/redis');

describe('todoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis methods
    (redis.get as jest.Mock).mockResolvedValue(null); // No cache by default
    (redis.set as jest.Mock).mockResolvedValue('OK');
    (redis.del as jest.Mock).mockResolvedValue(1);
    (redis.keys as jest.Mock).mockResolvedValue([]);
  });

  test('get debe delegar en ToDoRepository.get cuando no hay cache', async () => {
    // Mock: No hay cache
    (redis.get as jest.Mock).mockResolvedValue(null);

    // Mock: Repository devuelve un todo
    (todoRepository.get as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Test',
    } as any);

    const result = await todoService.get(1);

    // Verificar que se consultó el cache
    expect(redis.get).toHaveBeenCalledWith('todo:1');

    // Verificar que se llamó al repository
    expect(todoRepository.get).toHaveBeenCalledWith(1);

    // Verificar que se guardó en cache
    expect(redis.set).toHaveBeenCalledWith(
      'todo:1',
      JSON.stringify({ id: 1, title: 'Test' }),
      'EX',
      300,
    );

    // Verificar el resultado
    expect(result).toEqual({ id: 1, title: 'Test' });
  });

  test('get debe devolver del cache cuando está disponible', async () => {
    const cachedTodo = { id: 1, title: 'Cached Test' };

    // Mock: Hay cache disponible
    (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedTodo));

    const result = await todoService.get(1);

    // Verificar que se consultó el cache
    expect(redis.get).toHaveBeenCalledWith('todo:1');

    // Verificar que NO se llamó al repository (porque había cache)
    expect(todoRepository.get).not.toHaveBeenCalled();

    // Verificar el resultado
    expect(result).toEqual(cachedTodo);
  });

  test('update debe delegar en ToDoRepository.update y limpiar cache', async () => {
    (todoRepository.update as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Updated',
    } as any);

    const result = await todoService.update(1, { title: 'Updated' });

    expect(todoRepository.update).toHaveBeenCalledWith(1, { title: 'Updated' });
    expect(redis.del).toHaveBeenCalledWith('todo:1');
    expect(redis.keys).toHaveBeenCalledWith('todos:all:*');
    expect(result).toEqual({ id: 1, title: 'Updated' });
  });

  test('remove debe delegar en ToDoRepository.remove y limpiar cache', async () => {
    (todoRepository.remove as jest.Mock).mockResolvedValue(1 as any);

    const result = await todoService.remove(1);

    expect(todoRepository.remove).toHaveBeenCalledWith(1);
    expect(redis.del).toHaveBeenCalledWith('todo:1');
    expect(redis.keys).toHaveBeenCalledWith('todos:all:*');
    expect(result).toBe(1);
  });
});
