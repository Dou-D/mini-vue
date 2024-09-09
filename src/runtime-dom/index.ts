import { createRenderer } from '../runtime-core'

function createElement(type) {
    return document.createElement(type)
}

function patchProps(el, key, val) {
    el.setAttribute(key, val);
}

function insert(el: HTMLElement, container: HTMLElement) {
    container.append(el)
}

function patchEvent(el: HTMLElement, type, listener) {
    el.addEventListener(type, listener);
}

const renderer: any = createRenderer({
    createElement,
    patchProps,
    insert,
    patchEvent
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

export * from '../runtime-core'