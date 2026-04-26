import axios from "@/lib/axios";
import type { CreateAddressBody, UserAddress } from "@/types/user-profile";

function asAddressArray(data: unknown): UserAddress[] {
  const normalize = (arr: unknown[]): UserAddress[] =>
    arr.map((item) => {
      if (typeof item === "string") {
        return { address: item, full_address: item };
      }
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const addr =
          typeof rec.address === "string"
            ? rec.address
            : typeof rec.full_address === "string"
              ? rec.full_address
              : typeof rec.address_line === "string"
                ? rec.address_line
                : "";
        return {
          ...(rec as UserAddress),
          address: addr || undefined,
          full_address: (typeof rec.full_address === "string" ? rec.full_address : addr) || undefined,
        };
      }
      return {};
    });

  if (Array.isArray(data)) {
    return normalize(data);
  }
  if (!data || typeof data !== "object") {
    return [];
  }
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return normalize(o.items);
  if (Array.isArray(o.data)) return normalize(o.data);
  if (Array.isArray(o.addresses)) return normalize(o.addresses);
  if (o.profile && typeof o.profile === "object") {
    const profile = o.profile as Record<string, unknown>;
    if (Array.isArray(profile.addresses)) return normalize(profile.addresses);
  }
  return [];
}

export async function getMyProfile() {
  const { data } = await axios.get<unknown>("/users/me/profile");
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (o.user && typeof o.user === "object") {
      return o.user as Record<string, unknown>;
    }
    return data as Record<string, unknown>;
  }
  return {};
}

export async function getMyAddresses(): Promise<UserAddress[]> {
  const { data } = await axios.get<unknown>("/users/me/addresses");
  return asAddressArray(data);
}

export async function createMyAddress(body: CreateAddressBody): Promise<UserAddress | null> {
  // Backend hiện chỉ nhận payload tối giản: { address: "..." }
  const payload = { address: String(body.address ?? body.full_address ?? body.address_line ?? "").trim() };
  const { data } = await axios.post<unknown>("/users/me/addresses", payload);
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (o.address && typeof o.address === "object") {
      return o.address as UserAddress;
    }
    return data as UserAddress;
  }
  return null;
}
