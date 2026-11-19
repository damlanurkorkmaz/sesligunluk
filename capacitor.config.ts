import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Uygulama adı kesinleşince appId ve appName güncellenir (App Store Connect'teki Bundle ID ile aynı olmalı).
  appId: "com.gunnotu.app",
  appName: "Gün Notu",
  webDir: "out",
  ios: {
    contentInset: "never",
    backgroundColor: "#FAF7F2",
  },
};

export default config;
