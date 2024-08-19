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
这段代码在instance上创建一个新的函数emit，当调用instance.emit时——instance.emit(),其实调用的是emit,并且把instance当做第一个参数自动传递——emit(instance)。  
instance.emit("onClick")本质上是emit(instance, "onClick")  