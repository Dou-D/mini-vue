export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type
  };
  return component;
}

export function setupComponent(instance) {
  // initProps()
  // initSlots()
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const component = instance.type;
  const { setup } = component;
  if (setup) {
    const setupResult = setup();
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult: any) {
    
    if(typeof setupResult === "object") {
        instance.setupResult = setupResult
    }
    finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
    const component = instance.type
    instance.render = component.render
}

