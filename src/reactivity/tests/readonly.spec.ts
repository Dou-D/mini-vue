import { readonly, isReadonly, isProxy } from "../reactive";

describe("readonly", () => {
  it("should make nestd values readonly", () => {
    const original = { foo: 1, bar: { baz: 1 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReadonly(original.bar)).toBe(false);
    expect(isProxy(wrapped)).toBe(true);
    expect(isProxy(original)).toBe(false);
    expect(wrapped.foo).toBe(1);
  });

  it("should call console.warn when set value", () => {
    console.warn = jest.fn();
    const obj = readonly({ foo: 1 });
    obj.foo = 10;
    expect(console.warn).toHaveBeenCalled();
  });
});
