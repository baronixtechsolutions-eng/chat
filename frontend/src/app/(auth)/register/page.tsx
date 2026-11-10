"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";
import { type FieldErrors, validateRegister } from "@/lib/validation";

type FieldName = "name" | "email" | "password";

export default function RegisterPage() {
  const { register } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    setServerErrors([]);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: error.message });
      } else {
        setServerErrors(error instanceof ApiError ? error.messages : ["No se pudo crear la cuenta"]);
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">Empieza a conversar en segundos.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Alert messages={serverErrors} />
        <Field
          label="Nombre"
          autoComplete="name"
          value={values.name}
          onChange={update("name")}
          error={errors.name}
          disabled={submitting}
        />
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={values.password}
          onChange={update("password")}
          error={errors.password}
          disabled={submitting}
        />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
