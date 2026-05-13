export const APP_NAME = 'BLURRN';
export const APP_VERSION = '4.8';
export const APP_TAG = `${APP_NAME} v${APP_VERSION}`;
export const BUILD_VERSION = '0.3.7';

export const APP_TAGLINE = 'Light Flows Time';

export const VERSION_FEATURES: Record<string, { tagline: string; initMsg: string }> = {
  '4.5': { tagline: 'SDSS Core', initMsg: 'BLURRN v4.5 SDSS initialized' },
  '4.6': { tagline: 'Time Machine Ascension', initMsg: 'BLURRN v4.6 Time Machine - TDF breakthrough ready!' },
  '4.7': { tagline: 'Chrono Transport Cascade', initMsg: 'BLURRN v4.7 Chrono Transport - Dual Black Hole sync active!' },
  '4.8': { tagline: 'Light Flows Time', initMsg: 'BLURRN v4.8 — Light Flows Time' },
};

export const APP_FEATURE = VERSION_FEATURES[APP_VERSION] || { tagline: APP_TAGLINE, initMsg: `${APP_TAG} — ${APP_TAGLINE}` };
