/**
 * Impact Forecast Routes
 *
 * Admin API endpoints for the Revenue & Impact Forecasting Engine.
 */

import { Router, Request, Response } from 'express';
import { getImpactForecaster } from './forecaster';
import type { ChangeDescription, ForecastInput } from './types';

const ENABLE_IMPACT_FORECAST = process.env.ENABLE_IMPACT_FORECAST === 'true';

export function createImpactForecastRouter(): Router {
  const router = Router();

  // Feature flag middleware
  router.use((req: Request, res: Response, next) => {
    if (!ENABLE_IMPACT_FORECAST) {
      return res.status(404).json({ error: 'Impact Forecast is disabled' });
    }
    next();
  });

  /**
   * POST /forecast - Generate a forecast
   */
  router.post('/forecast', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const {
        source,
        proposalId,
        proposalType,
        changes,
        context,
      } = req.body;

      if (!source || !proposalId || !proposalType || !Array.isArray(changes)) {
        return res.status(400).json({
          error: 'Missing required fields: source, proposalId, proposalType, changes',
        });
      }

      const forecast = forecaster.quickForecast(
        source as ForecastInput['source'],
        proposalId,
        proposalType,
        changes as ChangeDescription[],
        context || {}
      );

      if (!forecast) {
        return res.status(500).json({ error: 'Failed to generate forecast' });
      }

      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: 'Forecast generation failed' });
    }
  });

  /**
   * GET /forecasts - Get all forecasts
   */
  router.get('/forecasts', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const forecasts = forecaster.getAllForecasts().slice(0, limit);

      res.json({
        total: forecaster.getAllForecasts().length,
        forecasts,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get forecasts' });
    }
  });

  /**
   * GET /forecasts/:id - Get forecast by ID
   */
  router.get('/forecasts/:id', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const forecast = forecaster.getForecast(req.params.id);

      if (!forecast) {
        return res.status(404).json({ error: 'Forecast not found' });
      }

      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get forecast' });
    }
  });

  /**
   * GET /forecasts/:id/explain - Get forecast explanation
   */
  router.get('/forecasts/:id/explain', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const forecast = forecaster.getForecast(req.params.id);

      if (!forecast) {
        return res.status(404).json({ error: 'Forecast not found' });
      }

      res.json({
        forecastId: forecast.id,
        explanation: forecast.explanation,
        assumptions: forecast.assumptions,
        caveats: forecast.caveats,
        confidence: forecast.confidence,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get explanation' });
    }
  });

  /**
   * POST /compare - Compare multiple forecasts
   */
  router.post('/compare', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const { forecastIds } = req.body;

      if (!Array.isArray(forecastIds) || forecastIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 forecast IDs required' });
      }

      const comparison = forecaster.compareForecasts(forecastIds);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: 'Comparison failed' });
    }
  });

  /**
   * POST /batch - Batch forecast multiple proposals
   */
  router.post('/batch', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const { proposals } = req.body;

      if (!Array.isArray(proposals)) {
        return res.status(400).json({ error: 'proposals must be an array' });
      }

      const forecasts: any[] = [];

      for (const proposal of proposals.slice(0, 10)) { // Limit to 10
        const forecast = forecaster.quickForecast(
          proposal.source,
          proposal.proposalId,
          proposal.proposalType,
          proposal.changes,
          proposal.context || {}
        );

        if (forecast) {
          forecasts.push({
            proposalId: proposal.proposalId,
            forecast,
          });
        }
      }

      res.json({
        processed: forecasts.length,
        forecasts,
      });
    } catch (error) {
      res.status(500).json({ error: 'Batch forecast failed' });
    }
  });

  /**
   * GET /summary - Get forecast summary
   */
  router.get('/summary', (req: Request, res: Response) => {
    try {
      const forecaster = getImpactForecaster();
      const forecasts = forecaster.getAllForecasts();

      if (forecasts.length === 0) {
        return res.json({
          totalForecasts: 0,
          avgConfidence: 0,
          avgNetImpact: 0,
          riskDistribution: {},
        });
      }

      const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;
      const avgNetImpact = forecasts.reduce((sum, f) => sum + f.netImpactScore, 0) / forecasts.length;

      const riskDistribution: Record<string, number> = {};
      for (const f of forecasts) {
        riskDistribution[f.overallRisk] = (riskDistribution[f.overallRisk] || 0) + 1;
      }

      const positiveImpactCount = forecasts.filter((f) => f.netImpactScore > 0).length;
      const highRiskCount = forecasts.filter(
        (f) => f.overallRisk === 'high' || f.overallRisk === 'critical'
      ).length;

      res.json({
        totalForecasts: forecasts.length,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgNetImpact: Math.round(avgNetImpact * 100) / 100,
        positiveImpactCount,
        highRiskCount,
        riskDistribution,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get summary' });
    }
  });

  return router;
}
