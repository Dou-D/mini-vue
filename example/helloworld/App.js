import { h } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js'
window.self = null
export const App = {
    render() {
        window.self = this
        return h("span", {
            id: "root",
            class: ["red", "hard"],
        },
            [
                h("span", {}, "hi" + this.msg),
                h(Foo, { count: 1 })
            ]
        )
    },

    setup() {
        return {
            msg: "mini-vue"
        }
    }
}

