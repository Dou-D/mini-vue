import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

/**
 * 创建自定义渲染器
 * @param options 自定义操作
 */
export function createRenderer(options) {
  const {
    createElement,
    patchProps: hostPatchProp,
    insert
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

  function processComponent(vnode: any, container: any, parent) {
    mountComponent(vnode, container, parent);
  }

  function isOn(key: string) {
    return /^on[A-Z]/.test(key);
  }

  function patchEvent(el: HTMLElement, type, listener) {
    el.addEventListener(type, listener);
  }

  function patchProps(el, key, val) {
    hostPatchProp(el, key, val)
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
    for (const key in props) {
      const val = props[key];
      if (isOn(key)) {
        const type = key.slice(2).toLowerCase();
        patchEvent(el, type, val);
      } else {
        hostPatchProp(el, key, val);
      }
    }
    insert(el, container)
  }

  function mountChildren(vnode, container: HTMLElement, parent) {
    vnode.children.forEach((v) => {
      patch(v, container, parent);
    });
  }

  function mountComponent(vnode: any, container, parent) {
    const instance = createComponentInstance(vnode, parent);
    setupComponent(instance);
    setupRenderEffect(instance, container, vnode);
  }

  function setupRenderEffect(instance, container, initialVnode) {
    effect(() => {
      // proxy为代理instance上的state(组件状态)和props(组件参数)
      const { proxy } = instance;
      // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
      const subTree = instance.render.call(proxy);
      patch(subTree, container, instance);
      initialVnode.el = subTree.el;
    })
  }

  return {
    createApp: createAppAPI(renderer)
  }
}
