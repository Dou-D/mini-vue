import { ref, h } from '../../lib/guide-mini-vue.esm.js'

// 左侧
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
// ]

// const nextChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "D"}, "D"),
//     h("p", { key: "E"}, "E"),
// ]

// 右侧
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
// ]

// const nextChildren = [
//     h("p", { key: "D"}, "D"),
//     h("p", { key: "E"}, "E"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
// ]

// 新的长 左侧一样
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
// ]

// const nextChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
//     h("p", { key: "D"}, "D"),
// ]
// 新的长 右侧一样
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
// ]

// const nextChildren = [
//     h("p", { key: "D"}, "D"),
//     h("p", { key: "C"}, "C"),
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
// ]
// 旧的长 左侧相同 删除 
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
// ]

// const nextChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
// ]
// 旧的长 右侧相同 删除 
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
// ]

// const nextChildren = [
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C"}, "C"),
// ]  
// A B C D F G
// A B E C F G
// const prevChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "C", id: "c-prev"}, "C"),
//     h("p", { key: "D"}, "D"),
//     h("p", { key: "F"}, "F"),
//     h("p", { key: "G"}, "G"),
// ]

// const nextChildren = [
//     h("p", { key: "A"}, "A"),
//     h("p", { key: "B"}, "B"),
//     h("p", { key: "E"}, "E"),
//     h("p", { key: "C", id: "c-next"}, "C"),
//     h("p", { key: "F"}, "F"),
//     h("p", { key: "G"}, "G"),
// ] 
// 优化删除逻辑
const prevChildren = [
    h("p", { key: "A"}, "A"),
    h("p", { key: "B"}, "B"),
    h("p", { key: "C", id: "c-prev"}, "C"),
    h("p", { key: "E"}, "E"),
    h("p", { key: "D"}, "D"),
    h("p", { key: "F"}, "F"),
    h("p", { key: "G"}, "G"),
]

const nextChildren = [
    h("p", { key: "A"}, "A"),
    h("p", { key: "B"}, "B"),
    h("p", { key: "E"}, "E"),
    h("p", { key: "C", id: "c-next"}, "C"),
    h("p", { key: "F"}, "F"),
    h("p", { key: "G"}, "G"),
]  
export default {
    name: "ArrayToText",
    setup() {
        const isChange = ref(false)
        window.isChange = isChange

        return {
            isChange
        }
    },
    render() {
        const self = this

        return self.isChange === true ? h("div", {}, nextChildren) : h("div", {}, prevChildren)
    }
}