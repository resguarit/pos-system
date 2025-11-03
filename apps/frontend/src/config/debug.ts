// Debug configuration to verify deployments
// This file is updated on each deployment to track when changes are deployed

export const DEBUG_INFO = {
  buildTimestamp: new Date().toISOString(),
  buildDate: new Date().toLocaleString('es-AR', { 
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'long'
  }),
  version: '1.0.0',
  debugEnabled: true
} as const;

// Log debug info to console (only in development or if explicitly enabled)
if (import.meta.env.DEV || DEBUG_INFO.debugEnabled) {
  console.log('🚀 POS System Debug Info:', DEBUG_INFO);
  console.log('📍 Build Timestamp:', DEBUG_INFO.buildTimestamp);
  console.log('📅 Build Date:', DEBUG_INFO.buildDate);
}

export default DEBUG_INFO;

