/**
 * Configuration > Users: your own account (name and password) for everyone, and for an administrator the list of Studio users
 * with creation, renaming, new passwords, roles and removal. Passwords are only ever typed here; the server keeps a hash.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { PasswordInput } from "./components/PasswordInput";
import { askConfirm } from "./askConfirm";
import { useCallback, useContext, useEffect, useState, type FormEvent } from "react";
import { changeAccount, clearUserPin, createUser, deleteUser, listUsers, setMyPin, setUserPin, updateUser, type ListedUser, type Role } from "./api";
import { SessionUserContext, useMayDo } from "./sessionContext";
import { errorText } from "./apiErrorText";
import { issueMessage, passwordIssues, pinIssues, type CredentialIssue } from "./ux/credentialRules";

type Props = { t: (key: string) => string; origin: string };
const ROLES: readonly Role[] = ["admin", "operator", "viewer", "panel"];

export function UsersPanel({ t, origin }: Props) {
  // Who is signed in comes from the one answer Studio keeps up to date (it asks again by itself), never from a question of this panel's own.
  const session = useContext(SessionUserContext);
  const me = session?.user ?? null;
  const [users, setUsers] = useState<ListedUser[] | null>(null);
  const [minimum, setMinimum] = useState(12);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [editing, setEditing] = useState("");
  const say = (text: string, bad = false) => setMessage({ text, bad });
  const explain = (error: unknown) => say(errorText(t, error, "userErr_"), true);

  // managing the other accounts is its own permission (an older server sends none, and then the role decides)
  const mayManage = useMayDo("manage_users");
  const isAdmin = me?.role === "admin" && mayManage;
  const reload = useCallback(async () => {
    if (!isAdmin) { setUsers(null); return; }
    try { const listed = await listUsers(origin); setUsers(listed.users); setMinimum(listed.minPasswordLength); } catch { /* the list keeps what it had; the next reload tries again */ }
  }, [origin, isAdmin]);
  useEffect(() => { void reload(); }, [reload]);

  // ---- my account ----
  const [account, setAccount] = useState({ username: "", current: "", next: "", repeat: "" });
  useEffect(() => { if (me) setAccount(current => ({ ...current, username: me.username })); }, [me?.id, me?.username]);   // eslint-disable-line react-hooks/exhaustive-deps
  const accountIssues = passwordIssues(account.next, { minimum, username: account.username, repeat: account.repeat });
  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (accountIssues.length) { say(issueMessage(t, accountIssues[0], minimum), true); return; }
    const change: { currentPassword: string; username?: string; newPassword?: string } = { currentPassword: account.current };
    if (me && account.username.trim() !== me.username) change.username = account.username.trim();
    if (account.next) change.newPassword = account.next;
    try {
      await changeAccount(origin, change);
      setAccount(current => ({ ...current, current: "", next: "", repeat: "" }));
      say(t("accountSaved"));
      await reload();
    } catch (error) { explain(error); }
  };

  // ---- my PIN ----
  const [mine, setMine] = useState({ pin: "", duress: "" });
  const digits = (value: string) => value.replace(/[^0-9]/g, "");
  const myPinIssues = pinIssues(mine.pin, mine.duress);
  const saveMyPin = async (clear = false) => {
    try {
      await setMyPin(origin, clear ? { currentPassword: account.current, clear: true } : { currentPassword: account.current, pin: mine.pin, ...(mine.duress ? { duress_pin: mine.duress } : {}) });
      setMine({ pin: "", duress: "" });
      setAccount(current => ({ ...current, current: "" }));
      say(t(clear ? "pinCleared" : "pinSaved"));
      await reload();
    } catch (error) { explain(error); }
  };

  // ---- administration ----
  const [fresh, setFresh] = useState<{ username: string; password: string; role: Role }>({ username: "", password: "", role: "operator" });
  const freshIssues = passwordIssues(fresh.password, { minimum, username: fresh.username });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (freshIssues.length) { say(issueMessage(t, freshIssues[0], minimum), true); return; }
    try { await createUser(origin, { ...fresh, username: fresh.username.trim() }); setFresh({ username: "", password: "", role: "operator" }); say(t("userCreated")); await reload(); }
    catch (error) { explain(error); }
  };
  const [draft, setDraft] = useState<{ username: string; password: string; role: Role; pin: string; duress: string; panicAllowed: boolean }>({ username: "", password: "", role: "operator", pin: "", duress: "", panicAllowed: false });
  const startEdit = (user: ListedUser) => { setEditing(user.id); setDraft({ username: user.username, password: "", role: user.role, pin: "", duress: "", panicAllowed: user.panicPhraseAllowed === true }); };
  const draftIssues = [...passwordIssues(draft.password, { minimum, username: draft.username }), ...pinIssues(draft.pin, draft.duress)];
  const saveEdit = async (user: ListedUser) => {
    if (draftIssues.length) { say(issueMessage(t, draftIssues[0], minimum), true); return; }
    const change: { username?: string; password?: string; role?: Role; panicPhraseAllowed?: boolean } = {};
    if (draft.username.trim() !== user.username) change.username = draft.username.trim();
    if (draft.password) change.password = draft.password;
    if (draft.role !== user.role) change.role = draft.role;
    if (draft.panicAllowed !== (user.panicPhraseAllowed === true)) change.panicPhraseAllowed = draft.panicAllowed;
    if (!Object.keys(change).length && !draft.pin) { setEditing(""); return; }
    try {
      if (Object.keys(change).length) await updateUser(origin, user.id, change);
      if (draft.pin) await setUserPin(origin, user.id, draft.pin, draft.duress || undefined);
      setEditing(""); say(t("userUpdated")); await reload(); }
    catch (error) { explain(error); }
  };
  const remove = async (user: ListedUser) => {
    if (!(await askConfirm(`${t("confirmDeleteUser")}\n\n${user.username}`, t))) return;
    try { await deleteUser(origin, user.id); say(t("userDeleted")); await reload(); } catch (error) { explain(error); }
  };
  const roleName = (role: Role) => t(role === "admin" ? "roleAdmin" : role === "panel" ? "rolePanel" : role === "viewer" ? "roleViewer" : "roleOperator");
  const day = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(); };
  const issuesNote = (list: CredentialIssue[]) => list.length === 0 ? null : <p className="users-issues muted small" role="status" data-testid="users-issues">{list.map(issue => issueMessage(t, issue, minimum)).join(" ")}</p>;
  const rule = `${t("passwordMinimum")} ${minimum} ${t("charactersWord")}.`;

  return <div className="users-panel">
    <article className="stack-card users-card">
      <h3>{t("myAccount")}{me && <small className="user-chip">{me.username} · {roleName(me.role)}</small>}</h3>
      <p className="muted">{t("accountHelp")}</p>
      <form className="users-form" onSubmit={event => void saveAccount(event)}>
        <label>{t("userName")}<input value={account.username} autoComplete="username" maxLength={40} onChange={event => setAccount({ ...account, username: event.target.value })} /></label>
        <label>{t("currentPassword")}<PasswordInput t={t} autoComplete="current-password" value={account.current} onChange={event => setAccount({ ...account, current: event.target.value })} /></label>
        <label>{t("newPassword")}<PasswordInput t={t} autoComplete="new-password" placeholder={t("keepPassword")} value={account.next} onChange={event => setAccount({ ...account, next: event.target.value })} /></label>
        <label>{t("confirmPassword")}<PasswordInput t={t} autoComplete="new-password" value={account.repeat} onChange={event => setAccount({ ...account, repeat: event.target.value })} /></label>
        {issuesNote(accountIssues.filter(issue => issue !== "pw_mismatch" || account.repeat !== ""))}
        <div className="users-actions"><button className="primary" type="submit" disabled={!me || !account.current || accountIssues.length > 0}>{t("saveAccount")}</button></div>
      </form>
      <h4>{t("pinTitle")}</h4>
      <p className="muted small">{t("pinHelp")} {t("currentPassword")}</p>
      <div className="users-form">
        <label>{t("pinValue")}<PasswordInput t={t} inputMode="numeric" autoComplete="off" maxLength={10} value={mine.pin} onChange={event => setMine({ ...mine, pin: digits(event.target.value) })} /></label>
        <label>{t("duressValue")}<PasswordInput t={t} inputMode="numeric" autoComplete="off" maxLength={10} value={mine.duress} onChange={event => setMine({ ...mine, duress: digits(event.target.value) })} /></label>
        {issuesNote(myPinIssues)}
        <div className="users-actions"><button className="primary" disabled={!me || !account.current || mine.pin.length === 0 || myPinIssues.length > 0} onClick={() => void saveMyPin()}>{t("pinSave")}</button><button disabled={!me || !account.current} onClick={() => void saveMyPin(true)}>{t("pinClear")}</button></div>
      </div>
    </article>

    {!session?.known && !me
      ? <article className="stack-card users-card"><h3>{t("usersTitle")}</h3><p className="muted">{t("usersSessionUnknown")}{session?.reason ? ` (${session.reason})` : ""}</p><div className="users-actions"><button className="primary" onClick={() => session?.refresh()}>{t("retryAction")}</button></div></article>
      : me?.role !== "admin"
      ? <article className="stack-card users-card"><h3>{t("usersTitle")}</h3><p className="muted">{t("usersAdminOnly")}</p></article>
      : <>
          <article className="stack-card users-card users-list">
            <h3>{t("usersTitle")} <small className="user-chip">{users?.length ?? 0}</small></h3>
            <p className="muted">{t("usersHelp")}</p>
            <ul>
              {(users ?? []).map(user => <li key={user.id} className={user.current ? "current" : ""}>
                {editing === user.id
                  ? <div className="users-edit">
                      <label>{t("userName")}<input value={draft.username} maxLength={40} onChange={event => setDraft({ ...draft, username: event.target.value })} /></label>
                      <label>{t("newPassword")}<PasswordInput t={t} autoComplete="new-password" placeholder={t("keepPassword")} value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })} /></label>
                      <label>{t("role")}<select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value as Role })}>{ROLES.map(role => <option key={role} value={role}>{roleName(role)}</option>)}</select></label>
                      <p className="muted small">{t(`roleHelp_${draft.role}`)}</p>
                      <label className="check"><input type="checkbox" checked={draft.panicAllowed} onChange={event => setDraft({ ...draft, panicAllowed: event.target.checked })} data-testid="user-panic-allowed" /> {t("userPanicAllowed")}</label>
                      <label>{t("pinValue")}<PasswordInput t={t} inputMode="numeric" autoComplete="off" maxLength={10} placeholder={user.hasPin ? t("keepPassword") : ""} value={draft.pin} onChange={event => setDraft({ ...draft, pin: digits(event.target.value) })} /></label>
                      <label>{t("duressValue")}<PasswordInput t={t} inputMode="numeric" autoComplete="off" maxLength={10} value={draft.duress} onChange={event => setDraft({ ...draft, duress: digits(event.target.value) })} /></label>
                      {issuesNote(draftIssues)}
                      <div className="users-actions"><button className="primary" disabled={draftIssues.length > 0} onClick={() => void saveEdit(user)}>{t("saveUser")}</button><button onClick={() => setEditing("")}>{t("cancel")}</button></div>
                    </div>
                  : <>
                      <div className="user-main"><strong>{user.username}</strong>{user.current && <small className="user-chip">{t("youLabel")}</small>}<span className={`role-badge ${user.role}`}>{roleName(user.role)}</span><small className="user-chip">{user.hasPin ? t("userHasPin") : t("userNoPin")}</small></div>
                      <small className="muted">{t("createdOn")} {day(user.createdAt)}</small>
                      <div className="users-actions"><button onClick={() => startEdit(user)}>{t("editUser")}</button>{user.hasPin && <button onClick={() => void clearUserPin(origin, user.id).then(() => { say(t("pinCleared")); return reload(); }).catch(explain)}>{t("pinClear")}</button>}<button className="danger-button" disabled={user.current} onClick={() => void remove(user)}>{t("deleteUser")}</button></div>
                    </>}
              </li>)}
            </ul>
          </article>
          <article className="stack-card users-card">
            <h3>{t("addUser")}</h3>
            <form className="users-form" onSubmit={event => void add(event)}>
              <label>{t("userName")}<input value={fresh.username} autoComplete="off" maxLength={40} onChange={event => setFresh({ ...fresh, username: event.target.value })} /></label>
              <label>{t("newPassword")}<PasswordInput t={t} autoComplete="new-password" value={fresh.password} onChange={event => setFresh({ ...fresh, password: event.target.value })} /></label>
              <label>{t("role")}<select value={fresh.role} onChange={event => setFresh({ ...fresh, role: event.target.value as Role })}>{ROLES.map(role => <option key={role} value={role}>{roleName(role)}</option>)}</select></label>
              <p className="muted small">{t("userName")}: {t("userNameRule")} · {rule}</p>
              {issuesNote(freshIssues)}
              <div className="users-actions"><button className="primary" type="submit" disabled={!fresh.username.trim() || !fresh.password || freshIssues.length > 0}>{t("createUser")}</button></div>
            </form>
          </article>
        </>}
    {message.text && <p className={`notice users-notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
  </div>;
}
