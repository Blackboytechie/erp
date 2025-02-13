import { supabase } from '@/config/supabaseClient';
import { errorHandler, ErrorSeverity } from './errorHandler';
import { logger, LogLevel } from './logger';
import { performanceMonitor } from './performanceMonitor';
import { configManager } from '@/config/configManager';

export interface ApiRequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	headers?: Record<string, string>;
	params?: Record<string, any>;
	body?: any;
	timeout?: number;
}

export interface ApiResponse<T> {
	data: T | null;
	error: Error | null;
	status: number;
}

export class ApiMiddleware {
	private static instance: ApiMiddleware;

	private constructor() {}

	public static getInstance(): ApiMiddleware {
		if (!ApiMiddleware.instance) {
			ApiMiddleware.instance = new ApiMiddleware();
		}
		return ApiMiddleware.instance;
	}

	public async request<T>(
		endpoint: string, 
		options: ApiRequestOptions = {}
	): Promise<ApiResponse<T>> {
		const startTime = performance.now();
		const metricName = `API_${endpoint}`;

		try {
			// Log request details
			logger.log(LogLevel.DEBUG, 'API Request', {
				endpoint,
				method: options.method || 'GET',
				params: options.params
			});

			// Perform the API request
			const { data, error } = await this.executeSupabaseRequest<T>(
				endpoint, 
				options
			);

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Log successful response
			logger.log(LogLevel.INFO, 'API Response', {
				endpoint,
				duration,
				status: data ? 200 : (error ? 400 : 500)
			});

			// Track performance
			performanceMonitor.start(metricName);
			performanceMonitor.end(metricName);

			return {
				data: data || null,
				error: error ? this.processError(error) : null,
				status: data ? 200 : (error ? 400 : 500)
			};
		} catch (error) {
			const processedError = error instanceof Error 
				? error 
				: new Error(String(error));

			// Log and handle unexpected errors
			errorHandler.log(
				processedError, 
				ErrorSeverity.HIGH, 
				{ endpoint, options }
			);

			logger.log(LogLevel.ERROR, 'API Request Failed', {
				endpoint,
				error: processedError
			});

			return {
				data: null,
				error: processedError,
				status: 500
			};
		}
	}

	private async executeSupabaseRequest<T>(
		endpoint: string, 
		options: ApiRequestOptions
	): Promise<{ data: T | null; error: any }> {
		const { method = 'GET', params = {}, body } = options;

		switch (method) {
			case 'GET':
				return await supabase
					.from(endpoint)
					.select()
					.match(params);
			case 'POST':
				return await supabase
					.from(endpoint)
					.insert(body)
					.select();
			case 'PUT':
				return await supabase
					.from(endpoint)
					.update(body)
					.match(params);
			case 'DELETE':
				return await supabase
					.from(endpoint)
					.delete()
					.match(params);
			default:
				throw new Error(`Unsupported method: ${method}`);
		}
	}

	private processError(error: any): Error {
		// Customize error processing based on error type
		const errorMap: Record<string, ErrorSeverity> = {
			'PGRST116': ErrorSeverity.LOW,     // No rows returned
			'PGRST000': ErrorSeverity.MEDIUM,  // Generic Postgrest error
			'AuthError': ErrorSeverity.HIGH    // Authentication related errors
		};

		const severity = errorMap[error.code] || ErrorSeverity.MEDIUM;
		
		errorHandler.log(error, severity);

		return error;
	}

	// Decorator for API method tracking
	public track() {
		return (
			target: any, 
			propertyKey: string, 
			descriptor: PropertyDescriptor
		) => {
			const originalMethod = descriptor.value;

			descriptor.value = async function(...args: any[]) {
				const apiMiddleware = ApiMiddleware.getInstance();
				const methodName = `${target.constructor.name}.${propertyKey}`;
				
				return apiMiddleware.request(methodName, {
					method: 'POST',
					body: args
				});
			};

			return descriptor;
		};
	}
}

export const apiMiddleware = ApiMiddleware.getInstance();