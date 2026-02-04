export const foundationEventBus = {
  emit: () => {},
  on: () => {},
  off: () => {},
  initialize: () => Promise.resolve(),
  getStats: () => ({
    totalEvents: 0,
    subscriberCount: 0,
    lastEventAt: null as Date | null,
  }),
};
