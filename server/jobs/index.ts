/**
 * Jobs Module - Background Processing System
 * 
 * Central export for all job-related functionality.
 * 
 * TASK 8: Background Optimizers
 */

export {
  BackgroundScheduler,
  getBackgroundScheduler,
  initBackgroundScheduler,
  resetBackgroundScheduler,
  scheduleBackgroundJob,
  processBackgroundJobs,
  getSchedulerMetrics,
  type BackgroundJob,
  type BackgroundJobType,
  type BackgroundJobPriority,
  type BackgroundJobStatus,
  type SchedulerConfig,
  type SchedulerMetrics,
  type JobResult,
} from './background-scheduler';
