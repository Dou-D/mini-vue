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

function remove(child) {
    const parent = child.parentNode
    if(parent) {
        parent.removeChild(child)
    }
}

function patchAttr(el: HTMLElement, key, val) {
    if (val === null || val === undefined) {
        el.removeAttribute(key)
    } else {
        el.setAttribute(key, val)
    }
}

function setElementText(el, text) {
    el.textContent = text
}

const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

export * from '../runtime-core'