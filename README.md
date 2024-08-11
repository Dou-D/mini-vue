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
