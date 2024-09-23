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
    insert: hostInsert
  } = options
  /**
   * 渲染器
   * @param vnode 虚拟节点
   * @param container 要挂载的根元素
   */
  function renderer(vnode, container) {
    patch(null, vnode, container, null, null);
  }
  /**
   * 按照是原生Element还是Component分类 递归调用patch
   * @param n1 旧vnode
   * @param n2 新vnode
   * @param container 要挂载的dom容器 在调用insertBefore时会使用
   * @param parent 
   * @param anchor 锚点 diff之后移动dom
   */
  function patch(n1, n2, container: HTMLElement, parent, anchor = null) {
    const { shapeFlag, type } = n2;

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parent, anchor);
        break;

      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parent, anchor);
        }
        break;
    }
  }


  function processFragment(n1, n2, container, parent, anchor) {
    mountChildren(n2.children, container, parent, anchor);
  }

  function processElement(n1, n2, container, parent, anchor) {
    if (!n1) {
      mountElement(n2, container, parent, anchor);
    } else {
      patchElement(n1, n2, container, parent, anchor)
    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    const el = (n2.el = n1.el)

    patchChildren(n1, n2, el, parentComponent, anchor)
    patchProps(el, oldProps, newProps)
  }
  /**
   * 页面元素变化`<el>children</el>`
   * @param n1 旧children
   * @param n2 新children
   * @param container el
   */
  function patchChildren(n1, n2, container, parentComponent, anchor) {
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
    } else {
      // Text -> Array
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "")
        mountChildren(newChildren, container, parentComponent, anchor)
      } else {
        // array to array
        patchKeyedChildren(oldChildren, newChildren, container, parentComponent)
      }
    }
  }

  function patchKeyedChildren(c1, c2, container, parentComponent) {
    let i = 0;
    const l1 = c1.length
    const l2 = c2.length
    let e1 = l1 - 1
    let e2 = l2 - 1

    function isSomeVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key
    }
    // 更新相同的前置节点
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]

      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, null)
      } else {
        break;
      }
      i++;
    }
    // 右侧相同
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]

      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, null)
      } else {
        break;
      }
      e1--
      e2--
    }
    // 解决长度增加问题 左侧相同
    //      A B
    // (D C)A B
    if (i > e1) {
      // i<=e2说明新child还没遍历完
      if (i <= e2) {
        const nextPosition = e2 + 1
        const anchor = nextPosition < l2 ? c2[nextPosition].el : null
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
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

  function processComponent(n1, n2, container: any, parent, anchor) {
    mountComponent(n2, container, parent, anchor);
  }

  function mountElement(vnode, container: HTMLElement, parent, anchor) {
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { children, props, shapeFlag } = vnode;
    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parent, anchor);
    }
    // props
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, null, val)
    }
    hostInsert(el, container, anchor)
  }

  function mountChildren(children, container: HTMLElement, parent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parent, anchor);
    });
  }

  function mountComponent(n2, container, parent, anchor) {
    const instance = createComponentInstance(n2, parent);
    setupComponent(instance);
    setupRenderEffect(instance, container, n2, anchor);
  }

  function setupRenderEffect(instance, container, initialVnode, anchor) {
    effect(() => {
      if (!instance.isMounted) {
        // proxy为代理instance上的state(组件状态)和props(组件参数)
        const { proxy } = instance;
        // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
        const subTree = instance.render.call(proxy);
        instance.subTree = subTree
        patch(null, subTree, container, instance, anchor);
        initialVnode.el = subTree.el;
        instance.isMounted = true
      } else {
        const { proxy } = instance;
        // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree
        instance.subTree = subTree
        patch(prevSubTree, subTree, container, instance, anchor);
      }
    })
  }

  return {
    createApp: createAppAPI(renderer)
  }
}
