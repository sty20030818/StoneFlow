<template>
	<!-- 三段式任务区域 -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
		<slot name="in-progress" />
		<slot name="todo" />
		<slot name="done" />
	</div>
</template>

