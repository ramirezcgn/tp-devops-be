import { Router } from 'express';
import { StressController } from '../controllers/stressController.js';

const router = Router();

/**
 * Stress Testing Routes
 * Generate controlled load for testing monitoring and autoscaling
 */

// CPU stress test
router.post('/cpu', StressController.cpuStress);

// Memory stress test
router.post('/memory', StressController.memoryStress);

// Combined stress test
router.post('/combined', StressController.combinedStress);

// Get current resource usage
router.get('/usage', StressController.getResourceUsage);

export default router;
