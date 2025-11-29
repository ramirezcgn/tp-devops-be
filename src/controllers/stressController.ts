import { Request, Response } from 'express';
import { trace } from '@opentelemetry/api';
import { logger } from '../middlewares/logger.middleware.js';
import { stressTestsTotal, stressTestDuration } from '../config/metrics.js';

const tracer = trace.getTracer('stress-controller');

/**
 * Stress Test Controller
 * Generates controlled load for CPU and memory testing
 */
export class StressController {
  /**
   * Generate CPU load
   * Performs intensive mathematical calculations
   */
  static async cpuStress(req: Request, res: Response) {
    const span = tracer.startSpan('stress.cpu');
    const duration = parseInt(req.query.duration as string) || 5000; // Default 5 seconds
    const intensity = parseInt(req.query.intensity as string) || 100; // Default 100%

    logger.info({
      msg: 'Starting CPU stress test',
      duration,
      intensity,
    });

    const startTime = Date.now();
    const endTime = startTime + duration;

    try {
      // CPU intensive calculation
      let result = 0;
      while (Date.now() < endTime) {
        // Fibonacci calculation (CPU intensive)
        for (let i = 0; i < intensity * 1000; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }
      }

      const actualDuration = Date.now() - startTime;

      span.setAttribute('stress.type', 'cpu');
      span.setAttribute('stress.duration.ms', actualDuration);
      span.setAttribute('stress.intensity', intensity);

      // Prometheus metrics
      stressTestsTotal.inc({ type: 'cpu' });
      stressTestDuration.observe({ type: 'cpu' }, actualDuration / 1000);

      logger.info({
        msg: 'CPU stress test completed',
        duration: actualDuration,
        intensity,
        result: result.toFixed(2),
      });

      res.json({
        success: true,
        type: 'cpu',
        duration: actualDuration,
        intensity,
        message: `CPU stress test completed in ${actualDuration}ms`,
      });
    } catch (error) {
      logger.error({ msg: 'CPU stress test failed', error });
      span.recordException(error as Error);
      res.status(500).json({
        success: false,
        error: 'CPU stress test failed',
      });
    } finally {
      span.end();
    }
  }

  /**
   * Generate Memory load
   * Allocates memory progressively
   */
  static async memoryStress(req: Request, res: Response) {
    const span = tracer.startSpan('stress.memory');
    const sizeMB = parseInt(req.query.sizeMB as string) || 100; // Default 100MB
    const duration = parseInt(req.query.duration as string) || 5000; // Default 5 seconds

    logger.info({
      msg: 'Starting memory stress test',
      sizeMB,
      duration,
    });

    const startTime = Date.now();
    const arrays: number[][] = [];

    try {
      // Allocate memory in chunks
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = sizeMB;

      for (let i = 0; i < totalChunks; i++) {
        // Create 1MB array filled with random numbers
        const chunk = new Array(chunkSize / 8).fill(0).map(() => Math.random());
        arrays.push(chunk);
      }

      // Hold memory for specified duration
      await new Promise((resolve) => setTimeout(resolve, duration));

      const actualDuration = Date.now() - startTime;
      const memoryUsed = process.memoryUsage();

      span.setAttribute('stress.type', 'memory');
      span.setAttribute('stress.size.mb', sizeMB);
      span.setAttribute('stress.duration.ms', actualDuration);
      span.setAttribute('memory.heap.used.mb', Math.round(memoryUsed.heapUsed / 1024 / 1024));

      // Prometheus metrics
      stressTestsTotal.inc({ type: 'memory' });
      stressTestDuration.observe({ type: 'memory' }, actualDuration / 1000);

      logger.info({
        msg: 'Memory stress test completed',
        duration: actualDuration,
        sizeMB,
        heapUsedMB: Math.round(memoryUsed.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsed.heapTotal / 1024 / 1024),
      });

      res.json({
        success: true,
        type: 'memory',
        duration: actualDuration,
        allocatedMB: sizeMB,
        heapUsedMB: Math.round(memoryUsed.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsed.heapTotal / 1024 / 1024),
        message: `Memory stress test completed - allocated ${sizeMB}MB for ${actualDuration}ms`,
      });

      // Clear arrays to release memory
      arrays.length = 0;
    } catch (error) {
      logger.error({ msg: 'Memory stress test failed', error });
      span.recordException(error as Error);
      res.status(500).json({
        success: false,
        error: 'Memory stress test failed',
      });
    } finally {
      span.end();
    }
  }

  /**
   * Combined stress test (CPU + Memory)
   */
  static async combinedStress(req: Request, res: Response) {
    const span = tracer.startSpan('stress.combined');
    const duration = parseInt(req.query.duration as string) || 10000; // Default 10 seconds
    const cpuIntensity = parseInt(req.query.cpuIntensity as string) || 50;
    const memoryMB = parseInt(req.query.memoryMB as string) || 50;

    logger.info({
      msg: 'Starting combined stress test',
      duration,
      cpuIntensity,
      memoryMB,
    });

    const startTime = Date.now();
    const endTime = startTime + duration;
    const arrays: number[][] = [];

    try {
      // Allocate memory
      const chunkSize = 1024 * 1024;
      for (let i = 0; i < memoryMB; i++) {
        const chunk = new Array(chunkSize / 8).fill(0).map(() => Math.random());
        arrays.push(chunk);
      }

      // CPU load while holding memory
      let result = 0;
      while (Date.now() < endTime) {
        for (let i = 0; i < cpuIntensity * 1000; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }
      }

      const actualDuration = Date.now() - startTime;
      const memoryUsed = process.memoryUsage();

      span.setAttribute('stress.type', 'combined');
      span.setAttribute('stress.duration.ms', actualDuration);
      span.setAttribute('stress.cpu.intensity', cpuIntensity);
      span.setAttribute('stress.memory.mb', memoryMB);

      // Prometheus metrics
      stressTestsTotal.inc({ type: 'combined' });
      stressTestDuration.observe({ type: 'combined' }, actualDuration / 1000);

      logger.info({
        msg: 'Combined stress test completed',
        duration: actualDuration,
        cpuIntensity,
        memoryMB,
        heapUsedMB: Math.round(memoryUsed.heapUsed / 1024 / 1024),
      });

      res.json({
        success: true,
        type: 'combined',
        duration: actualDuration,
        cpuIntensity,
        memoryMB,
        heapUsedMB: Math.round(memoryUsed.heapUsed / 1024 / 1024),
        message: `Combined stress test completed in ${actualDuration}ms`,
      });

      arrays.length = 0;
    } catch (error) {
      logger.error({ msg: 'Combined stress test failed', error });
      span.recordException(error as Error);
      res.status(500).json({
        success: false,
        error: 'Combined stress test failed',
      });
    } finally {
      span.end();
    }
  }

  /**
   * Get current resource usage
   */
  static async getResourceUsage(req: Request, res: Response) {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.json({
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        externalMB: Math.round(memoryUsage.external / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
    });
  }
}
