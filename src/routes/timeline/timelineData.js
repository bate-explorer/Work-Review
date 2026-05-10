function getActivityGroupKey(activity) {
  const appName = activity.app_name || '';
  const browserUrl = activity.browser_url;
  const normalizedUrl = browserUrl ? browserUrl.replace(/\/+$/, '') : '';
  if (browserUrl && browserUrl.trim()) {
    return `url:${appName}|${normalizedUrl}`;
  }
  return `app:${appName}|${activity.window_title || ''}`;
}

export function prepareTimelineActivities(activitiesData) {
  return [...activitiesData].sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return (b.id || 0) - (a.id || 0);
  });
}

export function upsertTimelineActivity(currentActivities, newActivity) {
  const existingById = currentActivities.findIndex((activity) => activity.id === newActivity.id);
  if (existingById >= 0) {
    return currentActivities.map((activity) =>
      activity.id === newActivity.id ? newActivity : activity
    );
  }

  // Match by GROUP BY key (app_name + browser_url/window_title) to avoid duplicates
  const newGroupKey = getActivityGroupKey(newActivity);
  const existingByGroup = currentActivities.findIndex(
    (activity) => getActivityGroupKey(activity) === newGroupKey
  );
  if (existingByGroup >= 0) {
    const existing = currentActivities[existingByGroup];
    // Merge: accumulate duration so the cumulative time doesn't reset
    // to the latest sample's tiny value when the backend emits a raw activity.
    const merged = {
      ...newActivity,
      duration: (existing.duration || 0) + (newActivity.duration || 0),
    };
    return prepareTimelineActivities(
      currentActivities.map((activity, idx) =>
        idx === existingByGroup ? merged : activity
      )
    );
  }

  return prepareTimelineActivities([newActivity, ...currentActivities]);
}
