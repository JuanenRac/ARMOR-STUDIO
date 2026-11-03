import { describe, expect, it } from "vitest";
import { ApiError, refusal } from "./transport";

const answer = (status: number, body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

describe("the refusal of a call that does not go through userCall", () => {
  it("keeps the machine code the server gave", async () => {
    const error = await refusal(answer(400, { error: "invalid_camera" }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "invalid_camera" });
    expect(await refusal(answer(409, { code: "conflict", error: "text" }))).toMatchObject({ code: "conflict" });
  });
  it("calls a refused session forbidden, and anything it cannot read generic", async () => {
    expect(await refusal(answer(401, {}))).toMatchObject({ code: "forbidden" });
    expect(await refusal(answer(403, "<html>"))).toMatchObject({ code: "forbidden" });
    expect(await refusal(answer(500, "<html>"))).toMatchObject({ code: "generic" });
  });
  it("does not take a sentence of the server for a code", async () => {
    expect(await refusal(answer(400, { error: "the administrator password must have at least 12 characters" }))).toMatchObject({ code: "generic" });
  });
});
