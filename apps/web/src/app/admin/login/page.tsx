"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { auth, login, errText } from "@/lib/api";
import { MOCK, DEMO } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.valid()) router.replace("/admin");
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(email.trim(), pw);
      router.replace("/admin");
    } catch (x) {
      setErr(errText(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="wrap login">
        <form onSubmit={submit}>
          <h1 className="ptitle">Masuk admin</h1>
          <label>
            Email
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Kata sandi
            <input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {err && <p className="msg err" role="alert">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? "Memeriksa…" : "Masuk"}</button>
          {MOCK && <p className="meta">{DEMO.email} dengan kata sandi {DEMO.password}</p>}
        </form>
      </main>
    </>
  );
}