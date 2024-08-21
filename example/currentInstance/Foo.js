import { getCurrentInstance, h } from "../../lib/guide-mini-vue.esm.js"

export const Foo = {
    name: "Foo",
    setup() {
        const instance = getCurrentInstance()
        console.log("🚀 ~ setup ~ instance:", instance)
    },
    render() {
        return h("div", {}, "foo")
    }
}