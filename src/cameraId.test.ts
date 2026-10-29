import { describe, expect, it, vi } from "vitest";
import { cleanCameraHost, newCameraId } from "./CameraSettings";

describe("camera form helpers", () => {
  it("makes a valid id without crypto.randomUUID (plain http)", () => {
    vi.stubGlobal("crypto", {});
    expect(newCameraId()).toMatch(/^cam-[0-9a-f]{8}$/);
    vi.unstubAllGlobals();
    expect(newCameraId()).toMatch(/^[A-Za-z0-9._-]{3,80}$/);
  });
  it("reduces a pasted address to a bare host", () => {
    expect(cleanCameraHost(" rtsp://user:pw@192.168.0.50:554/stream1 ")).toBe("192.168.0.50");
    expect(cleanCameraHost("http://cam.local/")).toBe("cam.local");
    expect(cleanCameraHost("10.0.0.7")).toBe("10.0.0.7");
  });
});
