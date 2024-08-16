import { isObject } from "../shared";
import { ShapeFlags } from "../shared/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";

/**
 * 渲染器
 * @param vnode 虚拟节点
 * @param container 要挂载的根元素
 */
export function renderer(vnode, container) {
  patch(vnode, container);
}

/**
 * 按照是原生Element还是Component分类 递归调用patch
 * @param vnode 虚拟节点
 * @param container 要挂载的根元素
 */
function patch(vnode, container) {
  const { shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

function patchProps(el, key, val) {
  el.setAttribute(key, val);
}

function patchEvent(el: HTMLElement, type, listener) {
  el.addEventListener(type, listener);
}

function processElement(vnode: any, container) {
  mountElement(vnode, container);
}

function isOn(key: string) {
  return /^on[A-Z]/.test(key);
}

function convertProps(rootVnode, rawProps) {
  if (!rawProps) {
    return;
  }
  for (const key in rawProps) {
    const val = rawProps[key];
    if (isOn(key)) {
      const type = key.slice(2).toLowerCase();
      patchEvent(rootVnode, type, val);
    } else {
      patchProps(rootVnode, key, val);
    }
  }
}

function mountElement(initialVnode, container: HTMLElement) {
  const el = (initialVnode.el = document.createElement("div"));
  const { children, props, shapeFlag } = initialVnode;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(initialVnode, el);
  }
  convertProps(el, props)
  container.append(el);
}

function mountChildren(vnode, container: HTMLElement) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container) {
  const instance = createComponentInstance(vnode);
  setupComponent(instance);
  setupRenderEffect(instance, container, vnode);
}

function setupRenderEffect(instance, container, vnode) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);
  patch(subTree, container);
  vnode.el = subTree.el;
}
