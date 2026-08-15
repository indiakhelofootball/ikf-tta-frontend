import { useSyncExternalStore } from 'react';
import { subscribeConfig, getConfigVersion } from '../utils/adminStorage';

// Re-renders the caller whenever the admin config cache changes, so sync getters
// like getVendorTypeNames() can be read inside a useMemo that actually updates.
export default function useConfigVersion() {
  return useSyncExternalStore(subscribeConfig, getConfigVersion, getConfigVersion);
}
