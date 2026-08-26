import type { Page } from "@playwright/test";

/**
 * Creates and logs in as a fresh throwaway user. Assumes the target Supabase
 * project has email confirmation disabled for sign-ups (typical for a dev/test
 * project) — see README "Tests end-to-end" for how to configure this.
 */
export async function signUpAndLogIn(page: Page) {
  const email = `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@carpintero.test`;
  const password = "carpintero-e2e-1234";

  await page.goto("/signup");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/dashboard");

  return { email, password };
}
