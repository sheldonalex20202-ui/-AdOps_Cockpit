import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: error.flatten() }, { status: 400 });
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error.message.startsWith("FORBIDDEN")) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "UNKNOWN_ERROR" }, { status: 500 });
}

export function withoutSecrets<T extends Record<string, unknown>>(record: T) {
  const clone = { ...record };
  delete clone.accessTokenEncrypted;
  delete clone.apiTokenEncrypted;
  return clone;
}

export function parseMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) throw new Error("Invalid money value");
  return n;
}
