import { h } from '../lib/guide-mini-vue.esm.js';

window.self = null
export const App = {
    render() {
        window.self = this 
        return h("div", {
            id: "root",
            class: ["red", "hard"],
            onClick() {
                console.log("click");
            },
            onMouseenter() {
                console.log("mouse");
            }
        },
        "hello " + this.msg
        )
    },

    setup() {
        return {
            msg: "mini-vue"
        }
    }
}

