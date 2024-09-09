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
    createElement: hostCreateElement,
    patchProps: hostPatchProp,
    insert
  } = options
  /**
   * 渲染器
   * @param vnode 虚拟节点
   * @param container 要挂载的根元素
   */
  function renderer(vnode, container) {
    patch(null, vnode, container, null);
  }

  /**
   * 按照是原生Element还是Component分类 递归调用patch
   * @param vnode 虚拟节点
   * @param container 要挂载的根元素
   */
  function patch(n1, n2, container, parent) {
    const { shapeFlag, type } = n2;


    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parent);
        break;

      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parent);
        }
        break;
    }
  }


  function processFragment(n1, n2, container, parent) {
    mountChildren(n2, container, parent);
  }

  function processElement(n1, n2, container, parent) {
    if (!n1) {
      mountElement(n2, container, parent);
      
    } else {
      patchElement(n1, n2, container)
    }
  }

  function patchElement(n1, n2, container) {
    console.log("patchElement");
    console.log(n1); 
    console.log(n2)
  }

  function processText(n1, n2, container: HTMLElement) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processComponent(n1, n2, container: any, parent) {
    mountComponent(n2, container, parent);
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

  function mountElement(vnode, container: HTMLElement, parent) {
    const el = (vnode.el = hostCreateElement(vnode.type));
    
    const { children, props, shapeFlag } = vnode;
    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parent);
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
      patch(null, v, container, parent);
    });
  }

  function mountComponent(n2, container, parent) {
    const instance = createComponentInstance(n2, parent);
    setupComponent(instance);
    setupRenderEffect(instance, container, n2);
  }

  function setupRenderEffect(instance, container, initialVnode) {
    effect(() => {
      if (!instance.isMounted) {
        // proxy为代理instance上的state(组件状态)和props(组件参数)
        const { proxy } = instance;
        // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
        const subTree = instance.render.call(proxy);
        instance.subTree = subTree
        patch(null, subTree, container, instance);
        initialVnode.el = subTree.el;
        instance.isMounted = true
      } else {
        const { proxy } = instance;
        // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree
        instance.subTree = subTree
        patch(prevSubTree, subTree, container, instance);
      }
    })
  }

  return {
    createApp: createAppAPI(renderer)
  }
}
