/**
 * Device context attached to reports (docs/FEEDBACK_AND_TRUST.md): app
 * version, platform, OS version, locale. No device identifiers.
 */
import { Platform } from 'react-native';

import i18n from '../i18n';
import pkg from '../../package.json';
import type { DeviceContext } from '../telemetry/reports';

export function deviceContext(): DeviceContext {
  return {
    appVersion: String(pkg.version).slice(0, 40),
    platform: Platform.OS.slice(0, 20),
    osVersion: String(Platform.Version).slice(0, 40),
    locale: (i18n.language || 'unknown').slice(0, 20),
  };
}
