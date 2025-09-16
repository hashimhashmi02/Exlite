import { api } from "./api";

export async function me() {
  return api.me();
}

export async function signIn(email: string) {
  
  return api.signin(email);
}
