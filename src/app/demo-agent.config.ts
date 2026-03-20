// Central demo transport configuration.
// This file defines the default mode, the live transport implementation choice,
// and the planned Freedom converse endpoint used when live mode is enabled.
export type DemoAgentMode = 'mock' | 'live';
export type DemoLiveTransport = 'custom-fetch' | 'ag-ui-client';

export const demoAgentConfig = {
  mode: 'mock' as DemoAgentMode,
  liveTransport: 'ag-ui-client' as DemoLiveTransport,
  liveEndpoint:
    'https://freedomfurnitureproduction1s4nmz28u.org.coveo.com/rest/organizations/freedomfurnitureproduction1s4nmz28u/commerce/unstable/agentic/converse'
};
