<template>
	<slot />
</template>

<script setup lang="ts">
	import { provideShellHeaderController } from './use-shell-header'

	provideShellHeaderController()
</script>
