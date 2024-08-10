import { isObject } from "../shared";
import { isTracking, trackEffects, triggerEffect } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value;
  public dep: Set<any>;
  private _rawValue;
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
    if (Object.is(value, this._rawValue)) return;
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

export function ref(value) {
  return new RefImpl(value);
}
