class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private metrics: Map<string, number[]>;

	private constructor() {
		this.metrics = new Map();
	}

	public static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	startTimer(operationName: string): number {
		return performance.now();
	}

	endTimer(operationName: string, startTime: number) {
		const duration = performance.now() - startTime;
		if (!this.metrics.has(operationName)) {
			this.metrics.set(operationName, []);
		}
		this.metrics.get(operationName)?.push(duration);
	}

	getMetrics(operationName: string) {
		return this.metrics.get(operationName) || [];
	}
}

export const performanceMonitor = PerformanceMonitor.getInstance();