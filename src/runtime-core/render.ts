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

function processElement(vnode: any, container) {
  mountElement(vnode, container);
}

function mountElement(initialVnode, container: HTMLElement) {
  const el = (initialVnode.el = document.createElement("div"));
  const { children, props, shapeFlag } = initialVnode;
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(initialVnode, el);
  }
  if (props) {
    for (const key in props) {
      patchProps(el, key, props[key]);
    }
  }
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
