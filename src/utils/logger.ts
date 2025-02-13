export enum LogLevel {
	DEBUG = 'debug',
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error'
}

class Logger {
	private static instance: Logger;

	private constructor() {}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	log(level: LogLevel, message: string, metadata?: Record<string, any>) {
		const timestamp = new Date().toISOString();
		const logData = {
			timestamp,
			level,
			message,
			...metadata
		};

		switch (level) {
			case LogLevel.DEBUG:
				console.debug(logData);
				break;
			case LogLevel.INFO:
				console.info(logData);
				break;
			case LogLevel.WARN:
				console.warn(logData);
				break;
			case LogLevel.ERROR:
				console.error(logData);
				break;
		}
	}
}

export const logger = Logger.getInstance();