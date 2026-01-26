<template>
	<!-- 垂直布局：三个区域依次排列 -->
	<div class="space-y-12">
		<slot name="in-progress" />
		<slot name="todo" />
		<slot name="done" />
	</div>
</template>

