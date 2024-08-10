import { isReadonly, shallowReadonly } from "../reactive";

describe("shallReadonly", () => {
  test("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({ n: { foo: 1 } });
    expect(isReadonly(props)).toBe(true);
    expect(isReadonly(props.n)).toBe(false);
  });

  it("should call console.warn when set value", () => {
    console.warn = jest.fn();
    const obj = shallowReadonly({ foo: 1 });
    obj.foo = 10;
    expect(console.warn).toHaveBeenCalled();
  });

});
