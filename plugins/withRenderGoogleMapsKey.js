const { withAndroidManifest } = require("@expo/config-plugins");

const APP_CONFIG_URL =
  "https://lyft-api-eofz.onrender.com/api/app-config";

let googleMapsApiKeyPromise;

async function getGoogleMapsApiKey() {
  if (!googleMapsApiKeyPromise) {
    googleMapsApiKeyPromise = fetch(APP_CONFIG_URL)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            typeof body?.error === "string"
              ? `Render app configuration failed: ${body.error}`
              : `Render app configuration failed (${response.status})`,
          );
        }
        if (
          typeof body?.googleMapsApiKey !== "string" ||
          !/^AIza[A-Za-z0-9_-]{20,}$/.test(body.googleMapsApiKey)
        ) {
          throw new Error("Render returned an invalid Google Maps API key");
        }
        return body.googleMapsApiKey;
      })
      .catch((error) => {
        googleMapsApiKeyPromise = undefined;
        throw error;
      });
  }
  return googleMapsApiKeyPromise;
}

module.exports = (config) =>
  withAndroidManifest(config, async (config) => {
    const apiKey = await getGoogleMapsApiKey();
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error("Android manifest has no application element");
    }

    application["meta-data"] ??= [];
    const mapKeyMetadata = application["meta-data"].find(
      (metadata) =>
        metadata.$["android:name"] === "com.google.android.geo.API_KEY",
    );
    if (mapKeyMetadata) {
      mapKeyMetadata.$["android:value"] = apiKey;
    } else {
      application["meta-data"].push({
        $: {
          "android:name": "com.google.android.geo.API_KEY",
          "android:value": apiKey,
        },
      });
    }

    return config;
  });
