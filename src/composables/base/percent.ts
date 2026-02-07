import { useClamp } from '@vueuse/math'
import { ref } from 'vue'

export function toBoundedPercent(value: number, min = 0, max = 100) {
	const bounded = useClamp(ref(value), min, max)
	return Math.round(bounded.value)
}
