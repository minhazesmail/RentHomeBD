import Link from "next/link";

import { AuthForm } from "./auth-form";

export default function LoginPage() {
  return (
    <main className="shell auth-shell">
      <section className="auth-layout">
        <div>
          <Link className="brand-link" href="/">RentHomeBD</Link>
          <p className="eyebrow">Secure account access</p>
          <h1 className="auth-title">Sign in to rent, list, or manage homes.</h1>
          <p className="intro">Use email now, or phone OTP once the project SMS provider is connected.</p>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
