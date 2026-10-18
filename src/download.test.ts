// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadText } from "./download";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("saving text as a file", () => {
  it("hands the browser a file with the name, the type and the text, and releases the address a little later, not at once", async () => {
    vi.useFakeTimers();
    const made: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => { made.push(blob); return "blob:armor/1"; });
    URL.revokeObjectURL = vi.fn();
    const clicked: Array<{ href: string; download: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicked.push({ href: this.href, download: this.download }); });
    downloadText("history.csv", "a,b\n1,2\n", "text/csv");
    expect(clicked).toEqual([{ href: "blob:armor/1", download: "history.csv" }]);
    expect(made[0]!.type).toBe("text/csv");
    expect(await made[0]!.text()).toBe("a,b\n1,2\n");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:armor/1");
  });
});
