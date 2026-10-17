import { describe, expect, it } from "vitest";
import { snapshotHasLogin } from "./snapshotLogin";

describe("a snapshot address with a login", () => {
  it("is found in the user information and in the usual parameters", () => {
    expect(snapshotHasLogin("http://admin:1234@192.168.0.203/snapshot.jpg")).toBe(true);
    expect(snapshotHasLogin("http://admin@192.168.0.203/snapshot.jpg")).toBe(true);
    expect(snapshotHasLogin("http://192.168.0.203/snap.cgi?usr=admin&pwd=1234")).toBe(true);
    expect(snapshotHasLogin("http://192.168.0.203/snap.cgi?channel=1&token=abc")).toBe(true);
  });
  it("is not found in an ordinary address, nor in one whose login the server already hid", () => {
    expect(snapshotHasLogin("http://192.168.0.203/snapshot.jpg")).toBe(false);
    expect(snapshotHasLogin("http://192.168.0.203/snap.cgi?channel=1&quality=high")).toBe(false);
    expect(snapshotHasLogin("http://***@192.168.0.203/snapshot.jpg")).toBe(false);
    expect(snapshotHasLogin("http://192.168.0.203/snap.cgi?usr=***&pwd=***")).toBe(false);
    expect(snapshotHasLogin("")).toBe(false);
  });
});
