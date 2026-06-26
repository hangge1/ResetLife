import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAccessRepository } from "../repositories/access-repository";
import { hasAccessSecret, verifyTrustedDeviceToken } from "./access-service";
import { DEVICE_TOKEN_COOKIE } from "./device-token";

export async function requireTrustedDevice() {
  const repository = createAccessRepository();

  if (!(await hasAccessSecret(repository))) {
    redirect("/access/create");
  }

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value ?? null;

  if (!verifyTrustedDeviceToken(repository, deviceToken).trusted) {
    redirect("/access/verify");
  }
}
