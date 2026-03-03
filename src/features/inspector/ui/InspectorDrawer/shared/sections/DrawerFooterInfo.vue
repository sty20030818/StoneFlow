<template>
	<footer class="px-6 py-3 border-t border-default bg-elevated/40 flex items-center justify-between gap-3">
		<div class="flex items-center gap-2 min-w-0">
			<slot name="left">
				<template v-if="creatorName">
					<UAvatar
						:src="avatarSrc"
						:alt="creatorName"
						size="sm"
						:ui="{
							root: 'rounded-full ring-1 ring-default/40',
						}" />
					<span class="text-xs font-semibold text-default truncate">{{ creatorName }}</span>
				</template>
			</slot>
		</div>
		<div class="text-[11px] font-medium text-default">
			<slot name="right">
				{{ rightText }}
			</slot>
		</div>
	</footer>
</template>

<script setup lang="ts">
	import avatarUrl from '@/assets/avatar.png'

	type Props = {
		rightText?: string
		creatorName?: string
		avatarSrc?: string
	}

	withDefaults(defineProps<Props>(), {
		rightText: '',
		creatorName: '',
		avatarSrc: avatarUrl,
	})
</script>
