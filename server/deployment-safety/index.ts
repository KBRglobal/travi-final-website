/**
 * Deployment Safety (Stub)
 * Deployment safety functionality was simplified during cleanup.
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/status', (req: Request, res: Response) => {
  res.json({
    healthy: true,
    checks: [],
    timestamp: new Date().toISOString(),
  });
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
  });
});

export const deploymentSafetyRoutes = router;

export function initializeDeploymentSafety(): void {
  // Stub - no-op
}
