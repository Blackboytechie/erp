import { errorHandler, ErrorSeverity } from './errorHandler';
import { logger, LogLevel } from './logger';
import { configManager } from '../config/configManager';
import { useAuth } from '@/contexts/AuthContext';

export interface TrackingEvent {
	name: string;
	category: 'navigation' | 'interaction' | 'feature_usage' | 'performance';
	timestamp: number;
	userId?: string;
	metadata?: Record<string, any>;
}

export interface FeatureUsageMetric {
	featureName: string;
	timesUsed: number;
	lastUsedAt: number;
	totalDuration: number;
}

export class AnalyticsTracker {
	private static instance: AnalyticsTracker;
	private events: TrackingEvent[] = [];
	private featureUsage: Record<string, FeatureUsageMetric> = {};
	private isEnabled: boolean;

	private constructor() {
		this.isEnabled = configManager.isFeatureEnabled('analyticsTracking');
	}

	public static getInstance(): AnalyticsTracker {
		if (!AnalyticsTracker.instance) {
			AnalyticsTracker.instance = new AnalyticsTracker();
		}
		return AnalyticsTracker.instance;
	}

	public trackEvent(event: Omit<TrackingEvent, 'timestamp'>): void {
		if (!this.isEnabled) return;

		try {
			const { user } = useAuth();

			const trackingEvent: TrackingEvent = {
				...event,
				timestamp: Date.now(),
				userId: user?.id
			};

			this.events.push(trackingEvent);
			this.sendToAnalyticsService(trackingEvent);

			logger.log(LogLevel.DEBUG, 'Analytics Event Tracked', { event: trackingEvent });
		} catch (error) {
			errorHandler.log(
				error as Error, 
				ErrorSeverity.LOW, 
				{ context: 'Analytics Event Tracking' }
			);
		}
	}

	public trackFeatureUsage(featureName: string, duration: number = 0): void {
		if (!this.isEnabled) return;

		try {
			if (!this.featureUsage[featureName]) {
				this.featureUsage[featureName] = {
					featureName,
					timesUsed: 0,
					lastUsedAt: Date.now(),
					totalDuration: 0
				};
			}

			const metric = this.featureUsage[featureName];
			metric.timesUsed++;
			metric.lastUsedAt = Date.now();
			metric.totalDuration += duration;

			this.sendFeatureUsageToAnalyticsService(metric);

			logger.log(LogLevel.DEBUG, 'Feature Usage Tracked', { metric });
		} catch (error) {
			errorHandler.log(
				error as Error, 
				ErrorSeverity.LOW, 
				{ context: 'Feature Usage Tracking' }
			);
		}
	}

	private sendToAnalyticsService(event: TrackingEvent): void {
		// Implement backend analytics service call
		// This could be a Supabase insert, external analytics service, etc.
		console.log('Analytics Event:', event);
	}

	private sendFeatureUsageToAnalyticsService(metric: FeatureUsageMetric): void {
		// Implement backend analytics service call
		console.log('Feature Usage Metric:', metric);
	}

	public getEventHistory(
		filter?: Partial<Pick<TrackingEvent, 'category' | 'name'>>
	): TrackingEvent[] {
		return filter 
			? this.events.filter(event => 
					Object.entries(filter).every(([key, value]) => event[key] === value)
				)
			: this.events;
	}

	public getFeatureUsageMetrics(): FeatureUsageMetric[] {
		return Object.values(this.featureUsage);
	}

	// Decorator for tracking method usage
	public track(
		category: TrackingEvent['category'] = 'feature_usage', 
		featureName?: string
	) {
		return (
			target: any, 
			propertyKey: string, 
			descriptor: PropertyDescriptor
		) => {
			const originalMethod = descriptor.value;

			descriptor.value = async function(...args: any[]) {
				const analyticsTracker = AnalyticsTracker.getInstance();
				const methodName = featureName || `${target.constructor.name}.${propertyKey}`;
				
				const startTime = performance.now();
				
				try {
					const result = await originalMethod.apply(this, args);
					
					const endTime = performance.now();
					const duration = endTime - startTime;
					
					analyticsTracker.trackEvent({
						name: methodName,
						category,
						metadata: { args, duration }
					});
					
					analyticsTracker.trackFeatureUsage(methodName, duration);
					
					return result;
				} catch (error) {
					analyticsTracker.trackEvent({
						name: `${methodName}_error`,
						category: 'interaction',
						metadata: { error }
					});
					
					throw error;
				}
			};

			return descriptor;
		};
	}
}

export const analyticsTracker = AnalyticsTracker.getInstance();