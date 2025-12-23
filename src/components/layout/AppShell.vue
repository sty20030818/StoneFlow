<script setup lang="ts">
import { ref } from "vue";

import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";

const space = ref<"all" | "work" | "study" | "personal">("all");
</script>

<template>
  <div class="h-full flex bg-default text-default">
    <Sidebar v-model:space="space" />

    <div class="flex-1 min-w-0 flex flex-col">
      <Topbar />

      <main class="flex-1 min-h-0 overflow-auto">
        <div class="p-4">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>



