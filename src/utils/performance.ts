import { ref } from 'vue'

type PerformanceMetric = {
	name: string
	duration: number
	timestamp: number
}

type BrowserMemory = {
	usedJSHeapSize: number
	totalJSHeapSize: number
	jsHeapSizeLimit: number
}

type PerformanceWithMemory = Performance & {
	memory?: BrowserMemory
}

export class PerformanceMonitor {
	private static instance: PerformanceMonitor
	private metrics: PerformanceMetric[] = []

	static getInstance(): PerformanceMonitor {
		if (!this.instance) {
			this.instance = new PerformanceMonitor()
		}
		return this.instance
	}

	mark(name: string): void {
		performance.mark(name)
	}

	measure(name: string, startMark: string, endMark: string): number {
		try {
			performance.measure(name, startMark, endMark)
			const measure = performance.getEntriesByName(name, 'measure')[0]
			if (measure) {
				this.metrics.push({
					name,
					duration: measure.duration,
					timestamp: Date.now(),
				})
				console.log(`[PERF] ${name}: ${measure.duration.toFixed(2)}ms`)
				return measure.duration
			}
			return 0
		} catch (error) {
			console.error('[PERF] Measure error:', error)
			return 0
		}
	}

	async monitorAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
		const start = performance.now()
		try {
			const result = await fn()
			const duration = performance.now() - start
			this.metrics.push({
				name,
				duration,
				timestamp: Date.now(),
			})
			console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)
			return result
		} catch (error) {
			const duration = performance.now() - start
			console.error(`[PERF] ${name} failed after ${duration.toFixed(2)}ms:`, error)
			throw error
		}
	}

	getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null {
		const perf = performance as PerformanceWithMemory
		if (perf.memory) {
			const memory = perf.memory
			return {
				usedJSHeapSize: memory.usedJSHeapSize / 1024 / 1024,
				totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024,
				jsHeapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024,
			}
		}
		return null
	}

	getMetrics(): PerformanceMetric[] {
		return [...this.metrics]
	}

	clearMetrics(): void {
		this.metrics = []
	}

	getSlowOperations(thresholdMs: number = 100): PerformanceMetric[] {
		return this.metrics.filter((m) => m.duration > thresholdMs)
	}
}

export function usePerformanceMonitor() {
	const monitor = PerformanceMonitor.getInstance()
	const metrics = ref<PerformanceMetric[]>([])
	const slowOperations = ref<PerformanceMetric[]>([])

	const refreshMetrics = () => {
		metrics.value = monitor.getMetrics()
		slowOperations.value = monitor.getSlowOperations()
	}

	const clearMetrics = () => {
		monitor.clearMetrics()
		metrics.value = []
		slowOperations.value = []
	}

	return {
		metrics,
		slowOperations,
		refreshMetrics,
		clearMetrics,
		monitorAsync: monitor.monitorAsync.bind(monitor),
	}
}
