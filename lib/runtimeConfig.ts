export interface RuntimeAppConfig {
  clerkPublishableKey: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  googleMapsApiKey: string;
  directionsApiKey: string;
  geoapifyApiKey: string;
  stripePublishableKey: string;
}

let runtimeAppConfig: RuntimeAppConfig | null = null;

export function setRuntimeAppConfig(config: RuntimeAppConfig): void {
  runtimeAppConfig = config;
}

export function getRuntimeAppConfig(): RuntimeAppConfig | null {
  return runtimeAppConfig;
}
