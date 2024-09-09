import { hasOwn } from '../shared'

const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots
};



export const publicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance;
    // 先寻找自身组件状态
    if (hasOwn(setupState, key)) {
      return setupState[key];
    }
    // 没有再向上查找props 
    else if (hasOwn(props, key)) {
      return props[key];
    }
    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
