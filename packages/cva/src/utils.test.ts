import { getSchema as getSchemaTool, type GetSchema } from "./tools";
import { getSchema, type GetSchema as UtilsGetSchema } from "./utils";

describe("cva/utils", () => {
  test("re-exports cva/tools' getSchema, identity and type intact", () => {
    expect(getSchema).toBe(getSchemaTool);
    expectTypeOf<UtilsGetSchema>().toEqualTypeOf<GetSchema>();
    expectTypeOf(getSchema).toEqualTypeOf<GetSchema>();
  });
});
