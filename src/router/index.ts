import { createRouter, createWebHashHistory } from "vue-router";

import Today from "../pages/Today.vue";
import Inbox from "../pages/Inbox.vue";
import Projects from "../pages/Projects.vue";
import Finish from "../pages/Finish.vue";
import Settings from "../pages/Settings.vue";

export const routes = [
  { path: "/", redirect: "/today" },
  { path: "/today", component: Today, meta: { title: "Today" } },
  { path: "/inbox", component: Inbox, meta: { title: "Inbox" } },
  { path: "/projects", component: Projects, meta: { title: "Projects" } },
  { path: "/finish", component: Finish, meta: { title: "Finish" } },
  { path: "/settings", component: Settings, meta: { title: "Settings" } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});


