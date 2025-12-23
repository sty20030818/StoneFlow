<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

type Space = "all" | "work" | "study" | "personal";

const route = useRoute();

const nav = [
  { to: "/today", label: "Today" },
  { to: "/inbox", label: "Inbox" },
  { to: "/projects", label: "Projects" },
  { to: "/finish", label: "Finish" },
  { to: "/settings", label: "Settings" },
];

const spaceItems = [
  { label: "All", value: "all" as const },
  { label: "工作", value: "work" as const },
  { label: "学习", value: "study" as const },
  { label: "个人", value: "personal" as const },
];

const currentPath = computed(() => route.path);

// M0：Space 只做界面占位；后续在状态仓库中持久化并驱动过滤
const space = defineModel<Space>("space", { default: "all" });
</script>

<template>
  <aside
    class="w-60 shrink-0 border-r border-default px-3 py-3 flex flex-col gap-4"
  >
    <div class="px-1">
      <div class="text-xs font-medium text-muted mb-2">Space</div>
      <USelect
        v-model="space"
        size="sm"
        color="neutral"
        :items="spaceItems"
        value-key="value"
        class="w-full"
      />
    </div>

    <nav class="flex flex-col gap-1">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="px-2 py-2 rounded-md text-sm hover:bg-elevated transition"
        :class="
          currentPath === item.to ? 'bg-elevated text-default' : 'text-muted'
        "
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="mt-auto px-2 text-xs text-muted">StoneFlow · M0</div>
  </aside>
</template>
