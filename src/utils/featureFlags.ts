import { errorHandler, ErrorSeverity } from './errorHandler';
import { logger, LogLevel } from './logger';
import { analyticsTracker } from './analyticsTracker';
import { configManager } from '@/config/configManager';

export interface FeatureFlagConfig {
	name: string;
	enabled: boolean;
	rolloutPercentage?: number;
	experimentVariants?: string[];
	defaultVariant?: string;
}

export interface ExperimentResult {
	variant: string;
	conversionRate?: number;
}

export class FeatureFlagManager {
	private static instance: FeatureFlagManager;
	private flags: Map<string, FeatureFlagConfig> = new Map();
	private experimentResults: Map<string, ExperimentResult[]> = new Map();

	private constructor() {
		// Load initial feature flags from configuration
		this.loadFeatureFlagsFromConfig();
	}

	public static getInstance(): FeatureFlagManager {
		if (!FeatureFlagManager.instance) {
			FeatureFlagManager.instance = new FeatureFlagManager();
		}
		return FeatureFlagManager.instance;
	}

	private loadFeatureFlagsFromConfig(): void {
		const config = configManager.getConfig();
		
		// Assuming feature flags are stored in configuration
		Object.entries(config.featureFlags || {}).forEach(([name, flag]) => {
			this.registerFeatureFlag({
				name,
				enabled: flag.enabled,
				rolloutPercentage: 100
			});
		});
	}

	public registerFeatureFlag(config: FeatureFlagConfig): void {
		this.flags.set(config.name, {
			...config,
			rolloutPercentage: config.rolloutPercentage ?? 100
		});

		logger.log(LogLevel.INFO, 'Feature flag registered', { 
			name: config.name, 
			config 
		});
	}

	public isFeatureEnabled(
		featureName: string, 
		userId?: string
	): boolean {
		const flag = this.flags.get(featureName);

		if (!flag) {
			logger.log(LogLevel.WARN, 'Feature flag not found', { featureName });
			return false;
		}

		if (!flag.enabled) return false;

		// Percentage-based rollout
		if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
			const hash = this.hashUserId(userId);
			return hash <= flag.rolloutPercentage;
		}

		return true;
	}

	public getExperimentVariant(
		experimentName: string, 
		userId?: string
	): string {
		const flag = this.flags.get(experimentName);

		if (!flag || !flag.experimentVariants) {
			logger.log(LogLevel.WARN, 'Experiment not found', { experimentName });
			return flag?.defaultVariant || 'control';
		}

		// Deterministic variant selection based on user ID
		const hash = this.hashUserId(userId);
		const variantIndex = hash % flag.experimentVariants.length;
		
		return flag.experimentVariants[variantIndex];
	}

	public recordExperimentResult(
		experimentName: string, 
		result: ExperimentResult
	): void {
		if (!this.experimentResults.has(experimentName)) {
			this.experimentResults.set(experimentName, []);
		}

		const results = this.experimentResults.get(experimentName)!;
		results.push(result);

		// Track experiment result
		analyticsTracker.trackEvent({
			name: `experiment_result_${experimentName}`,
			category: 'experiments',
			metadata: { result }
		});

		logger.log(LogLevel.INFO, 'Experiment result recorded', { 
			experimentName, 
			result 
		});
	}

	public getExperimentResults(
		experimentName: string
	): ExperimentResult[] {
		return this.experimentResults.get(experimentName) || [];
	}

	private hashUserId(userId?: string): number {
		if (!userId) return Math.floor(Math.random() * 100);

		// Simple hash function to distribute users consistently
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			const char = userId.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}

		return Math.abs(hash % 100);
	}

	// Decorator for feature flag method gating
	public feature(featureName: string) {
		return (
			target: any, 
			propertyKey: string, 
			descriptor: PropertyDescriptor
		) => {
			const originalMethod = descriptor.value;

			descriptor.value = function(...args: any[]) {
				const featureFlagManager = FeatureFlagManager.getInstance();
				
				if (!featureFlagManager.isFeatureEnabled(featureName)) {
					logger.log(LogLevel.WARN, 'Feature flag disabled', { 
						featureName,
						method: `${target.constructor.name}.${propertyKey}` 
					});
					return null;
				}

				return originalMethod.apply(this, args);
			};

			return descriptor;
		};
	}
}

export const featureFlagManager = FeatureFlagManager.getInstance();