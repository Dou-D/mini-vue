import { ShapeFlags } from "../shared/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";


export function createRenderer(options) {
  const {
    createElement,
    patchProps,
    patchEvent,
    insert,
  } = options
  /**
   * 渲染器
   * @param vnode 虚拟节点
   * @param container 要挂载的根元素
   */
  function renderer(vnode, container) {
    patch(vnode, container);
  }

  /**
   * 按照是原生Element还是Component分类 递归调用patch
   * @param vnode 虚拟节点
   * @param container 要挂载的根元素
   */
  function patch(vnode, container, parent = null) {
    const { shapeFlag, type } = vnode;

    switch (type) {
      case Fragment:
        processFragment(vnode, container, parent);
        break;

      case Text:
        processText(vnode, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parent);
        }
        break;
    }
  }


  function processFragment(vnode, container, parent) {
    mountChildren(vnode, container, parent);
  }

  function processElement(vnode: any, container, parent) {
    mountElement(vnode, container, parent);
  }

  function processText(vnode, container: HTMLElement) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
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

  function mountElement(initialVnode, container: HTMLElement, parent) {
    const el = (initialVnode.el = createElement(initialVnode.type));
    const { children, props, shapeFlag } = initialVnode;
    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(initialVnode, el, parent);
    }
    // props
    convertProps(el, props);
    insert(el, container)
  }

  function mountChildren(vnode, container: HTMLElement, parent) {
    vnode.children.forEach((v) => {
      patch(v, container, parent);
    });
  }

  function processComponent(vnode: any, container: any, parent) {
    mountComponent(vnode, container, parent);
  }

  function mountComponent(vnode: any, container, parent) {
    const instance = createComponentInstance(vnode, parent);
    setupComponent(instance);
    setupRenderEffect(instance, container, vnode);
  }

  function setupRenderEffect(instance, container, vnode) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    patch(subTree, container, instance);
    vnode.el = subTree.el;
  }

  return {
    createApp: createAppAPI(renderer)
  }
}
