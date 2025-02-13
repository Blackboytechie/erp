interface AppConfig {
	apiBaseUrl: string;
	appName: string;
	environment: string;
}

class ConfigManager {
	private static instance: ConfigManager;
	private config: AppConfig;

	private constructor() {
		this.config = {
			apiBaseUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
			appName: import.meta.env.VITE_APP_NAME || 'Distribution ERP',
			environment: import.meta.env.MODE || 'development'
		};
	}

	public static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	getConfig(): AppConfig {
		return this.config;
	}
}

export const configManager = ConfigManager.getInstance();