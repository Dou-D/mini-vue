const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        key: props && props.key,
        el: null,
        shapeFlag: getShapeFlag(type),
    };
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // children是object,并且type是组件时才触发slot
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot && typeof slot === "function") {
        return createVNode(Fragment, {}, slot(props));
    }
}

function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}

const isObject = (target) => {
    return target && typeof target === "object";
};

const extend = Object.assign;

const capitalize = (str) => {
    return str[0].toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};

const EMPTY_OBJ = {};

// 缓存 优化
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        } //嵌套reactive和readonly
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
        }
        return res;
    };
}
function createSetter(isReadonly = false) {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`${target}是只读的，您不能修改他的${key}属性`);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function isReactive(value) {
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(rawTarget, baseHandlers) {
    if (!isObject(rawTarget)) {
        console.warn(`target ${rawTarget} 必须是一个对象`);
        return;
    }
    return new Proxy(rawTarget, baseHandlers);
}

let activeEffect; // 当前的副作用函数
let shouldTrack;
class ReactiveEffect {
    scheduler;
    deps = [];
    _fn;
    onStop;
    active = true;
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this._fn = fn;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const res = this._fn();
        shouldTrack = false;
        return res;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
const targetMap = new Map(); // reactive对象 key:val val是Map
/**
 *
 * @param target
 * @param key
 * @跟踪依赖
 */
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && isReactive !== undefined;
}
/**
 *
 * @param target
 * @param key
 * @触发依赖
 */
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key); // targetMap是Record<key, val>, val是Set
    triggerEffect(dep);
}
function triggerEffect(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

class RefImpl {
    _value;
    dep;
    __v_isRef = true;
    _rawValue;
    constructor(value) {
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(value) {
        if (Object.is(value, this._rawValue))
            return;
        this._rawValue = value;
        this._value = convert(value);
        triggerEffect(this.dep);
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(value) {
    if (isTracking()) {
        trackEffects(value.dep);
    }
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}
function ref(value) {
    return new RefImpl(value);
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
};
const publicInstanceProxyHandlers = {
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

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {}, // setup返回值
        props: {},
        slots: {},
        emit: () => { },
        isMounted: false,
        subTree: null,
        provides: parent ? parent.provides : {},
        parent,
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    const { setup } = component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    instance.render = component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function inject(key, defaultVal) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultVal) {
            if (typeof defaultVal === "function") {
                return defaultVal();
            }
            return defaultVal;
        }
    }
}
function provide(key, val) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = val;
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

/**
 * 创建自定义渲染器
 * @param options 自定义操作
 */
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, remove: hostRemove, setElementText: hostSetElementText, insert: hostInsert } = options;
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
    function patch(n1, n2, container, parent, anchor = null) {
        const { shapeFlag, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
        }
        else {
            patchElement(n1, n2, container, parent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    /**
     * 页面元素变化`<el>children</el>`
     * @param n1 旧children
     * @param n2 新children
     * @param container el
     */
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const { shapeFlag } = n2;
        const oldChildren = n1.children;
        const newChildren = n2.children;
        // Array -> Text n2是文本节点
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // n1是数组节点
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(n1.children);
                hostSetElementText(container, newChildren);
            }
            if (oldChildren !== newChildren) {
                hostSetElementText(container, newChildren);
            }
        }
        else {
            // Text -> Array
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                hostSetElementText(container, "");
                mountChildren(newChildren, container, parentComponent, anchor);
            }
            else {
                // array to array
                patchKeyedChildren(oldChildren, newChildren, container, parentComponent);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent) {
        let i = 0;
        const l1 = c1.length;
        const l2 = c2.length;
        let e1 = l1 - 1;
        let e2 = l2 - 1;
        function isSomeVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 更新相同的前置节点
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, null);
            }
            else {
                break;
            }
            i++;
        }
        // 右侧相同
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, null);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 解决长度增加问题 左侧相同
        //      A B
        // (D C)A B
        if (i > e1) {
            // i<=e2说明新child还没遍历完
            if (i <= e2) {
                const nextPosition = e2 + 1;
                const anchor = nextPosition < l2 ? c2[nextPosition].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
    }
    function unmountChildren(children) {
        for (const element of children) {
            const el = element.el;
            hostRemove(el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            if (oldProps !== null) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        const prevProp = oldProps[key];
                        hostPatchProp(el, key, prevProp, null);
                    }
                }
            }
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processComponent(n1, n2, container, parent, anchor) {
        mountComponent(n2, container, parent, anchor);
    }
    function mountElement(vnode, container, parent, anchor) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { children, props, shapeFlag } = vnode;
        // children
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parent, anchor);
        }
        // props
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parent, anchor) {
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
                instance.subTree = subTree;
                patch(null, subTree, container, instance, anchor);
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const { proxy } = instance;
                // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        createApp: createAppAPI(renderer)
    };
}

function createElement(type) {
    return document.createElement(type);
}
function isOn(key) {
    return /^on[A-Z]/.test(key);
}
function patchProp(el, key, prevProp, nextProp) {
    if (isOn(key)) {
        const type = key.slice(2).toLowerCase();
        patchEvent(el, type, nextProp);
    }
    else {
        patchAttr(el, key, nextProp);
    }
}
/**
 *
 * @param child 要插入的节点
 * @param container 子节点列表
 * @param anchor 在其之前插入 newNode 的节点。如果为 null，newNode 将被插入到节点的子节点列表末尾
 */
function insert(child, container, anchor) {
    container.insertBefore(child, anchor || null);
}
function patchEvent(el, type, listener) {
    el.addEventListener(type, listener);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function patchAttr(el, key, val) {
    if (val === null || val === undefined) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, val);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { Fragment, Text, createApp, createComponentInstance, createRenderer, createTextVNode, createVNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots, setupComponent, unRef };
