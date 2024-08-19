import { camelize, toHandlerKey } from "../shared/emit";

export function emit(instance, event, ...args) {
  const { props } = instance;


  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  handler && handler(...args);
}
