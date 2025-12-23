import { LazyStore } from "@tauri-apps/plugin-store";

export type HomeView = "today" | "projects" | "focus" | "inbox";
export type InfoDensity = "comfortable" | "compact";

export interface SettingsModel {
  homeView: HomeView;
  density: InfoDensity;
  autoStart: boolean;
}

export const DEFAULT_SETTINGS: SettingsModel = {
  homeView: "today",
  density: "comfortable",
  autoStart: true,
};

export const settingsStore = new LazyStore("settings.json", {
  defaults: {
    settings: DEFAULT_SETTINGS,
  },
  autoSave: 200,
});



