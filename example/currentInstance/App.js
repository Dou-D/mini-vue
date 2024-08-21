import { h, createTextVNode, getCurrentInstance } from "../../lib/guide-mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
  name: "App",
  render() {
    return h("div", {}, [h("p", {}, "currentInstance"), h(Foo)])
  },

  setup() {
    const currentInstance = getCurrentInstance()
    console.log("🚀 ~ setup ~ currentInstance:", currentInstance)
    
  },
};
