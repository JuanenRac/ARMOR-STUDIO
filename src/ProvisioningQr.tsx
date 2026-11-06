/**
 * The pairing code of a node, for the form that adds a node: shown as a QR code (the id of the node and the address of the server, no secret) and read from the camera or from a picture.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import jsQR from "jsqr";
import type { Translate } from "./components/camera";
import { buildProvisioning, parseProvisioning, provisioningSvg, type Provisioning } from "./provisioningCode";

/** Reads the QR code in a picture; null when there is none. */
export function readQr(image: ImageData): string | null {
  return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

/** The QR code of a node, drawn from the id and the server; nothing is drawn when either is not valid. */
export function ProvisioningQr({ t, nodeId, server }: { t: Translate; nodeId: string; server: string }) {
  const text = useMemo(() => buildProvisioning(nodeId, server), [nodeId, server]);
  const picture = useMemo(() => (text ? `data:image/svg+xml;utf8,${encodeURIComponent(provisioningSvg(text))}` : null), [text]);
  if (!picture) return <p className="muted small">{t("adm_qr_invalid")}</p>;
  return <div className="provision-qr">
    <img src={picture} alt={t("adm_qr_alt")} width={220} height={220} style={{ background: "#fff", padding: 6 }} />
    <p className="muted small">{t("adm_qr_help")}</p>
  </div>;
}

/** Reads the code from the camera (a frame four times a second) or from a picture of it; `onRead` gets the node and the server it holds. */
export function ProvisionScanner({ t, onRead, onClose }: { t: Translate; onRead: (read: Provisioning) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("");
  const accept = (text: string | null) => {
    const read = parseProvisioning(text);
    if (read) { onRead(read); return true; }
    setMessage(t("adm_qr_not_ours"));
    return false;
  };
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setMessage(t("adm_qr_no_camera")); return; }
    let stopped = false, stream: MediaStream | null = null, timer = 0;
    const canvas = document.createElement("canvas");
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then(opened => {
      if (stopped) { opened.getTracks().forEach(track => track.stop()); return; }
      stream = opened;
      const element = video.current;
      if (!element) return;
      element.srcObject = opened;
      void element.play().catch(() => undefined);
      timer = window.setInterval(() => {
        if (element.videoWidth === 0) return;
        canvas.width = element.videoWidth; canvas.height = element.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(element, 0, 0);
        const text = readQr(context.getImageData(0, 0, canvas.width, canvas.height));
        if (text !== null && parseProvisioning(text)) { window.clearInterval(timer); accept(text); }
      }, 250);
    }).catch(() => { if (!stopped) setMessage(t("adm_qr_no_camera")); });
    return () => { stopped = true; window.clearInterval(timer); stream?.getTracks().forEach(track => track.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fromPicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("canvas");
      context.drawImage(bitmap, 0, 0);
      const text = readQr(context.getImageData(0, 0, canvas.width, canvas.height));
      if (text === null) setMessage(t("adm_qr_none_found")); else accept(text);
    } catch { setMessage(t("adm_qr_none_found")); }
  };
  return <div className="provision-scan">
    <video ref={video} muted playsInline style={{ width: "100%", maxWidth: 320, background: "#000" }} />
    <label className="act-btn">{t("adm_qr_from_picture")}<input type="file" accept="image/*" onChange={event => void fromPicture(event)} style={{ display: "none" }} /></label>
    <button type="button" onClick={onClose}>{t("close")}</button>
    {message && <p className="notice bad" role="status">{message}</p>}
  </div>;
}
