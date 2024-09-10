import { createRenderer } from '../runtime-core'

function createElement(type) {
    return document.createElement(type)
}

function isOn(key: string) {
    return /^on[A-Z]/.test(key);
}

function patchProp(el, key, prevProp, nextProp) {
    if (isOn(key)) {
        const type = key.slice(2).toLowerCase();
        patchEvent(el, type, nextProp);
    } else {
        patchAttr(el, key, nextProp)
    }
}

function insert(el: HTMLElement, container: HTMLElement) {
    container.append(el)
}

function patchEvent(el: HTMLElement, type, listener) {
    el.addEventListener(type, listener);
}

function patchAttr(el: HTMLElement, key, val) {
    if (val === null || val === undefined) {
        el.removeAttribute(key)
    } else {
        el.setAttribute(key, val)
    }
}

const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

export * from '../runtime-core'