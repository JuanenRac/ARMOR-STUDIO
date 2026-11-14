/**
 * Configuration > Security: the QR that sets up an app on a phone. An administrator keeps the installations they set up (a name and an https address each, in this browser only), picks one
 * and makes a QR with the address, the fingerprint of the local authority and a code of one use for five minutes. The QR holds no password and opens no session. The code ends by itself and the
 * picture goes away with it. It works once the server option "set-up code for apps" is on; off, the server answers 404 and the card says so.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { makeEnrolmentCode } from "./api/enrolment";
import { errorText } from "./apiErrorText";
import { buildEnrolment, enrolmentSvg, loadProfiles, saveProfiles, withProfile, type InstallationProfile } from "./enrolmentCode";

type Made = { text: string; endsAt: number; fingerprint: string | null };

export function EnrolmentCard({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [profiles, setProfiles] = useState<InstallationProfile[]>(loadProfiles);
  const [picked, setPicked] = useState(profiles[0]?.name ?? "");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState({ text: "", bad: false });
  const current = profiles.find(profile => profile.name === picked) ?? profiles[0];
  const live = made !== null && made.endsAt > now;
  useEffect(() => {
    if (!made) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [made]);
  const picture = useMemo(() => (made && live ? `data:image/svg+xml;utf8,${encodeURIComponent(enrolmentSvg(made.text))}` : null), [made, live]);
  const change = (next: InstallationProfile[], keep: string) => { setProfiles(next); saveProfiles(next); setPicked(keep); };
  const addProfile = (event: FormEvent) => {
    event.preventDefault();
    const next = withProfile(profiles, name, address);
    if (!next) { setMessage({ text: t("enr_bad_profile"), bad: true }); return; }
    change(next, name.trim().slice(0, 40)); setName(""); setAddress(""); setMessage({ text: "", bad: false });
  };
  const removeProfile = () => { if (current) { change(profiles.filter(profile => profile.name !== current.name), ""); setMade(null); } };
  const make = async () => {
    if (!current || busy) return;
    setBusy(true); setMessage({ text: "", bad: false }); setMade(null);
    try {
      const answer = await makeEnrolmentCode(origin, current.origin);
      const text = buildEnrolment(answer.origin, answer.code, answer.ca_fingerprint);
      if (!text) throw new TypeError("invalid code");
      setMade({ text, endsAt: Date.parse(answer.expires_at), fingerprint: answer.ca_fingerprint }); setNow(Date.now());
    } catch (error) { setMessage({ text: errorText(t, error, "enr_err_"), bad: true }); }
    finally { setBusy(false); }
  };
  const left = made ? Math.max(0, Math.ceil((made.endsAt - now) / 1000)) : 0;
  return <article className="stack-card sec-card" data-testid="security-enrolment">
    <h3>{t("enr_title")}</h3>
    <p className="muted">{t("enr_help")}</p>
    {profiles.length > 0 && <label>{t("enr_pick")}
      <select value={current?.name ?? ""} onChange={event => { setPicked(event.target.value); setMade(null); }} data-testid="enrolment-profile">
        {profiles.map(profile => <option key={profile.name} value={profile.name}>{`${profile.name} - ${profile.origin}`}</option>)}
      </select>
    </label>}
    <div className="users-actions">
      <button className="primary" disabled={busy || !current} onClick={() => void make()} data-testid="enrolment-make">{t("enr_make")}</button>
      <button disabled={!current} onClick={removeProfile}>{t("enr_remove")}</button>
    </div>
    {picture && made && <div className="provision-qr" data-testid="enrolment-qr">
      <img src={picture} alt={t("enr_alt")} width={240} height={240} style={{ background: "#fff", padding: 6 }} />
      <p className="muted small">{`${t("enr_valid")} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</p>
      <p className="muted small">{made.fingerprint ? `${t("enr_fingerprint")}: ${made.fingerprint.match(/.{2}/g)?.join(":") ?? ""}` : t("enr_no_fingerprint")}</p>
    </div>}
    {made && !live && <p className="notice" role="status" data-testid="enrolment-expired">{t("enr_expired")}</p>}
    <form onSubmit={addProfile}>
      <label>{t("enr_name")}<input value={name} maxLength={40} onChange={event => setName(event.target.value)} /></label>
      <label>{t("enr_address")}<input value={address} inputMode="url" placeholder="https://armor.example.org:18080" spellCheck={false} onChange={event => setAddress(event.target.value)} /></label>
      <div className="users-actions"><button disabled={name.trim() === "" || address.trim() === ""}>{t("enr_save")}</button></div>
    </form>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status" data-testid="enrolment-message">{message.text}</p>}
  </article>;
}
