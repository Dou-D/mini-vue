'use strict';

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
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
    const { createElement: hostCreateElement, patchProps: hostPatchProp, insert } = options;
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
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container) {
        console.log("patchElement");
        console.log(n1);
        console.log(n2);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processComponent(n1, n2, container, parent) {
        mountComponent(n2, container, parent);
    }
    function isOn(key) {
        return /^on[A-Z]/.test(key);
    }
    function patchEvent(el, type, listener) {
        el.addEventListener(type, listener);
    }
    function mountElement(vnode, container, parent) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { children, props, shapeFlag } = vnode;
        // children
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parent);
        }
        // props
        for (const key in props) {
            const val = props[key];
            if (isOn(key)) {
                const type = key.slice(2).toLowerCase();
                patchEvent(el, type, val);
            }
            else {
                hostPatchProp(el, key, val);
            }
        }
        insert(el, container);
    }
    function mountChildren(vnode, container, parent) {
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
                instance.subTree = subTree;
                patch(null, subTree, container, instance);
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const { proxy } = instance;
                // 调用render的时候 this指向proxy subTree中的虚拟节点state包含instance.setupState以及instance.props 
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance);
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
function patchProps(el, key, val) {
    el.setAttribute(key, val);
}
function insert(el, container) {
    container.append(el);
}
function patchEvent(el, type, listener) {
    el.addEventListener(type, listener);
}
const renderer = createRenderer({
    createElement,
    patchProps,
    insert,
    patchEvent
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.Fragment = Fragment;
exports.Text = Text;
exports.createApp = createApp;
exports.createComponentInstance = createComponentInstance;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.createVNode = createVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.setupComponent = setupComponent;
exports.unRef = unRef;
