export enum ErrorSeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

interface ErrorContext {
	context?: string;
	metadata?: Record<string, any>;
}

class ErrorHandler {
	private static instance: ErrorHandler;

	private constructor() {}

	public static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	log(error: Error, severity: ErrorSeverity, context?: ErrorContext) {
		console.error(`[${severity.toUpperCase()}] Error:`, {
			message: error.message,
			stack: error.stack,
			...context
		});
	}
}

export const errorHandler = ErrorHandler.getInstance();