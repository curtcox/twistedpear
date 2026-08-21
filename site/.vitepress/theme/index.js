import DefaultTheme from "vitepress/theme";
import SampleCatalog from "./SampleCatalog.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("SampleCatalog", SampleCatalog);
  },
};
