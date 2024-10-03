在导入 package.json 时指定导入属性为 json 类型。这是因为在 ES 模块中直接导入 JSON 文件需要显式指定导入属性类型。为了解决这个问题，你需要在 rollup.config.js 中进行如下修改：

```js
import { main, module } from "./package.json" assert { type: "json" };
import typescript from '@rollup/plugin-typescript';

export default {
    input: "./src/index.ts",
    output: [
        {
            format: "cjs",
            file: main
        },
        {
            format: "es",
            file: module
        }
    ],
    plugins: [typescript()]
}

```

## bind

```js
instance.emit = emit.bind(null, instance);
```

这段代码在 instance 上创建一个新的函数 emit，当调用 instance.emit 时——instance.emit(),其实调用的是 emit,并且把 instance 当做第一个参数自动传递——emit(instance)。  
instance.emit("onClick")本质上是 emit(instance, "onClick")

TODO: 
```ts
// renderer/mountComponent
function mountComponent(vnode: any, container, parent) {
  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  setupRenderEffect(instance, container, vnode);
}
```

TODO:
```ts
// renderer/setupRenderEffect
  function setupRenderEffect(instance, container, vnode) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    patch(subTree, container, instance);
    vnode.el = subTree.el;
  }
```

```ts
// component/setupStatefulComponent
function setupStatefulComponent(instance) {
  const component = instance.type;

  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);

  const { setup } = component;
  if (setup) {
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit
    });
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult);
  }
}
```
## 双端diff
`patchKeyedChildren`的e1和e2不能跟起始值指针一样同步，Array to Array新旧的长度可能不一样。  

## key的作用
对比新旧节点的key，相同的情况下可以复用节点，但打补丁操作还是要做的。  

