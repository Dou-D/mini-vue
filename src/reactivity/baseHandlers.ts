import { track, trigger } from "./effect";
import { ReactiveFlags } from "./reactive";

// 缓存 优化
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

function createGetter(readonly = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !readonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return readonly;
    }
    if (!readonly) {
      track(target, key);
    }
    const res = Reflect.get(target, key);
    return res;
  };
}
function createSetter(readonly = false) {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    trigger(target, key);
    return res;
  };
}

export const mutableHandlers = {
  get,
  set,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`${target}是只读的，您不能修改他的${key}属性`);
    return true;
  },
};
