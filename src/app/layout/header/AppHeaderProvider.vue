<template>
	<slot />
</template>

<script setup lang="ts">
	import { provideAppHeaderController } from './useAppHeader'

	provideAppHeaderController()
</script>
