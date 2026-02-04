// Stub - Scheduling module disabled
import { Express } from "express";

export function registerSchedulingRoutes(_app: Express): void {
  // Disabled
}

export const isSchedulingEnabled = () => false;

// Scheduler stubs
export const startScheduler = async () => {};
export const stopScheduler = () => {};
export const getSchedulerMetrics = () => ({ running: false });
export const triggerSchedulerRun = async () => null;
export const isSchedulerRunning = () => false;

// Schedule service stubs
export const scheduleContent = async () => null;
export const cancelSchedule = async () => null;
export const getUpcoming = async () => [];
export const getCalendar = async () => [];
export const getScheduleStatus = async () => null;
export const getFailures = async () => [];
export const isEnabled = () => false;

// Types
export type ContentSchedule = { id: string };
export type ScheduleRequest = { contentId: string };
export type CalendarItem = { id: string };
export type CalendarView = { items: CalendarItem[] };
export type UpcomingSchedule = { items: ContentSchedule[] };
export type ScheduleResult = { success: boolean };
export type PublishResult = { success: boolean };
export type ScheduleStatus = string;
export type PublishMode = string;
