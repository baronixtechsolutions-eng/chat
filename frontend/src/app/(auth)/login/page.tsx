"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";
import { type FieldErrors, validateLogin } from "@/lib/validation";

export default function LoginPage() {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    setServerErrors([]);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
    } catch (error) {
      setServerErrors(error instanceof ApiError ? error.messages : ["No se pudo iniciar sesión"]);
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Inicia sesión</h1>
      <p className="mt-1 text-sm text-slate-500">Bienvenido de nuevo.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Alert messages={serverErrors} />
        <Field
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={update("email")}
          error={errors.email}
          disabled={submitting}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={update("password")}
          error={errors.password}
          disabled={submitting}
        />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Regístrate
        </Link>
      </p>
    </>
  );
}
