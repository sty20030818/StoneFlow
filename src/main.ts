import { createApp } from "vue";
import App from "./App.vue";

import { createPinia } from "pinia";
import ui from "@nuxt/ui/vue-plugin";

import { router } from "./router";
import "./styles/main.css";

createApp(App).use(createPinia()).use(router).use(ui).mount("#app");
