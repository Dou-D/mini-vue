import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
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
    patchProp: hostPatchProp,
    remove: hostRemove,
    setElementText: hostSetElementText,
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
    mountChildren(n2.children, container, parent);
  }

  function processElement(n1, n2, container, parent) {
    if (!n1) {
      mountElement(n2, container, parent);

    } else {
      patchElement(n1, n2, container, parent)
    }
  }

  function patchElement(n1, n2, container, parentComponent) {
    console.log("patchElement");
    console.log(n1);
    console.log(n2)
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    const el = (n2.el = n1.el)

    patchChildren(n1, n2, el, parentComponent)
    patchProps(el, oldProps, newProps)
  }
  /**
   * 页面元素变化`<el>children</el>`
   * @param n1 旧children
   * @param n2 新children
   * @param container el
   */
  function patchChildren(n1, n2, container, parentComponent) {
    const prevShapeFlag = n1.shapeFlag
    const { shapeFlag } = n2
    const oldChildren = n1.children
    const newChildren = n2.children
    // Array -> Text n2是文本节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // n1是数组节点
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children)
        hostSetElementText(container, newChildren)
      }
      if (oldChildren !== newChildren) {
        hostSetElementText(container, newChildren)
      }
    }else {
      // Text -> Array
      if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        hostSetElementText(container, "")
        mountChildren(newChildren, container, parentComponent)
      }
    }
  }

  function unmountChildren(children) {
    for (const element of children) {
      const el = element.el
      hostRemove(el)
    }
  }

  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      if (oldProps !== null) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            const prevProp = oldProps[key]
            hostPatchProp(el, key, prevProp, null)
          }
        }
      }
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]

        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }
    }
  }

  function processText(n1, n2, container: HTMLElement) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processComponent(n1, n2, container: any, parent) {
    mountComponent(n2, container, parent);
  }

  function mountElement(vnode, container: HTMLElement, parent) {
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { children, props, shapeFlag } = vnode;
    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parent);
    }
    // props
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, null, val)
    }
    insert(el, container)
  }

  function mountChildren(children, container: HTMLElement, parent) {
    children.forEach((v) => {
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
