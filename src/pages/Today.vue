<script setup lang="ts">
import { ref } from "vue";

import { hello } from "../services/tauri/hello";

const name = ref("StoneFlow");
const result = ref<string>("");
const loading = ref(false);

async function runHello() {
  try {
    loading.value = true;
    result.value = await hello(name.value);
  } catch (err) {
    console.error(err);
    result.value = "调用失败（请看控制台错误）";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1">
      <div class="text-lg font-semibold">Today</div>
      <div class="text-sm text-muted">M0：验证 Tauri ↔ Rust command 通路。</div>
    </div>

    <div
      class="rounded-lg border border-default bg-elevated p-4 space-y-3 max-w-xl"
    >
      <div class="text-sm font-medium text-default">Rust hello</div>

      <div class="flex items-center gap-2">
        <UInput v-model="name" class="w-64" placeholder="输入名字…" />
        <UButton
          color="neutral"
          variant="subtle"
          :loading="loading"
          label="调用 hello"
          @click="runHello"
        />
      </div>

      <div v-if="result" class="text-sm text-default">
        返回：<span class="font-mono">{{ result }}</span>
      </div>
    </div>
  </section>
</template>
