/**
 * Configuration > Users: your own account (name and password) for everyone, and for an administrator the list of Studio users
 * with creation, renaming, new passwords, roles and removal. Passwords are only ever typed here; the server keeps a hash.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useContext, useEffect, useState, type FormEvent } from "react";
import { ApiError, changeAccount, createUser, deleteUser, listUsers, updateUser, type ListedUser, type Role } from "./api";
import { SessionUserContext } from "./sessionContext";

type Props = { t: (key: string) => string; origin: string };
const ROLES: readonly Role[] = ["admin", "operator"];

export function UsersPanel({ t, origin }: Props) {
  // Who is signed in comes from the one answer Studio keeps up to date (it asks again by itself), never from a question of this panel's own.
  const session = useContext(SessionUserContext);
  const me = session?.user ?? null;
  const [users, setUsers] = useState<ListedUser[] | null>(null);
  const [minimum, setMinimum] = useState(12);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [editing, setEditing] = useState("");
  const say = (text: string, bad = false) => setMessage({ text, bad });
  const explain = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : "generic";
    const key = `userErr_${code}`, text = t(key);
    say(text === key ? t("userErr_generic") : text, true);
  };

  const isAdmin = me?.role === "admin";
  const reload = useCallback(async () => {
    if (!isAdmin) { setUsers(null); return; }
    try { const listed = await listUsers(origin); setUsers(listed.users); setMinimum(listed.minPasswordLength); } catch { /* the list keeps what it had; the next reload tries again */ }
  }, [origin, isAdmin]);
  useEffect(() => { void reload(); }, [reload]);

  // ---- my account ----
  const [account, setAccount] = useState({ username: "", current: "", next: "", repeat: "" });
  useEffect(() => { if (me) setAccount(current => ({ ...current, username: me.username })); }, [me]);
  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (account.next && account.next !== account.repeat) { say(t("passwordsDontMatch"), true); return; }
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

  // ---- administration ----
  const [fresh, setFresh] = useState<{ username: string; password: string; role: Role }>({ username: "", password: "", role: "operator" });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try { await createUser(origin, { ...fresh, username: fresh.username.trim() }); setFresh({ username: "", password: "", role: "operator" }); say(t("userCreated")); await reload(); }
    catch (error) { explain(error); }
  };
  const [draft, setDraft] = useState<{ username: string; password: string; role: Role }>({ username: "", password: "", role: "operator" });
  const startEdit = (user: ListedUser) => { setEditing(user.id); setDraft({ username: user.username, password: "", role: user.role }); };
  const saveEdit = async (user: ListedUser) => {
    const change: { username?: string; password?: string; role?: Role } = {};
    if (draft.username.trim() !== user.username) change.username = draft.username.trim();
    if (draft.password) change.password = draft.password;
    if (draft.role !== user.role) change.role = draft.role;
    if (!Object.keys(change).length) { setEditing(""); return; }
    try { await updateUser(origin, user.id, change); setEditing(""); say(t("userUpdated")); await reload(); }
    catch (error) { explain(error); }
  };
  const remove = async (user: ListedUser) => {
    if (!window.confirm(`${t("confirmDeleteUser")}\n\n${user.username}`)) return;
    try { await deleteUser(origin, user.id); say(t("userDeleted")); await reload(); } catch (error) { explain(error); }
  };
  const roleName = (role: Role) => t(role === "admin" ? "roleAdmin" : "roleOperator");
  const day = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(); };
  const rule = `${t("passwordMinimum")} ${minimum} ${t("charactersWord")}.`;

  return <div className="users-panel">
    <article className="stack-card users-card">
      <h3>{t("myAccount")}{me && <small className="user-chip">{me.username} · {roleName(me.role)}</small>}</h3>
      <p className="muted">{t("accountHelp")}</p>
      <form className="users-form" onSubmit={event => void saveAccount(event)}>
        <label>{t("userName")}<input value={account.username} autoComplete="username" maxLength={40} onChange={event => setAccount({ ...account, username: event.target.value })} /></label>
        <label>{t("currentPassword")}<input type="password" autoComplete="current-password" value={account.current} onChange={event => setAccount({ ...account, current: event.target.value })} /></label>
        <label>{t("newPassword")}<input type="password" autoComplete="new-password" placeholder={t("keepPassword")} value={account.next} onChange={event => setAccount({ ...account, next: event.target.value })} /></label>
        <label>{t("confirmPassword")}<input type="password" autoComplete="new-password" value={account.repeat} onChange={event => setAccount({ ...account, repeat: event.target.value })} /></label>
        <div className="users-actions"><button className="primary" type="submit" disabled={!me || !account.current}>{t("saveAccount")}</button></div>
      </form>
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
                      <label>{t("newPassword")}<input type="password" autoComplete="new-password" placeholder={t("keepPassword")} value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })} /></label>
                      <label>{t("role")}<select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value as Role })}>{ROLES.map(role => <option key={role} value={role}>{roleName(role)}</option>)}</select></label>
                      <div className="users-actions"><button className="primary" onClick={() => void saveEdit(user)}>{t("saveUser")}</button><button onClick={() => setEditing("")}>{t("cancel")}</button></div>
                    </div>
                  : <>
                      <div className="user-main"><strong>{user.username}</strong>{user.current && <small className="user-chip">{t("youLabel")}</small>}<span className={`role-badge ${user.role}`}>{roleName(user.role)}</span></div>
                      <small className="muted">{t("createdOn")} {day(user.createdAt)}</small>
                      <div className="users-actions"><button onClick={() => startEdit(user)}>{t("editUser")}</button><button className="danger-button" disabled={user.current} onClick={() => void remove(user)}>{t("deleteUser")}</button></div>
                    </>}
              </li>)}
            </ul>
          </article>
          <article className="stack-card users-card">
            <h3>{t("addUser")}</h3>
            <form className="users-form" onSubmit={event => void add(event)}>
              <label>{t("userName")}<input value={fresh.username} autoComplete="off" maxLength={40} onChange={event => setFresh({ ...fresh, username: event.target.value })} /></label>
              <label>{t("newPassword")}<input type="password" autoComplete="new-password" value={fresh.password} onChange={event => setFresh({ ...fresh, password: event.target.value })} /></label>
              <label>{t("role")}<select value={fresh.role} onChange={event => setFresh({ ...fresh, role: event.target.value as Role })}>{ROLES.map(role => <option key={role} value={role}>{roleName(role)}</option>)}</select></label>
              <p className="muted small">{t("userName")}: {t("userNameRule")} · {rule}</p>
              <div className="users-actions"><button className="primary" type="submit" disabled={!fresh.username.trim() || !fresh.password}>{t("createUser")}</button></div>
            </form>
          </article>
        </>}
    {message.text && <p className={`notice users-notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
  </div>;
}
