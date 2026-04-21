import axios from "@/lib/axios";
import type {
  CreateManagerBody,
  CreateStaffBody,
  ManagementUser,
  ManagerListResponse,
  MessageResponse,
  MessageUserResponse,
  StaffListResponse,
  UpdateManagerBody,
  UpdateStaffBody,
} from "@/types/management";

function mapUser(raw: unknown): ManagementUser {
  const u = raw as Record<string, unknown>;
  return {
    id: String(u.id ?? u._id ?? ""),
    email: String(u.email ?? ""),
    role: String(u.role ?? ""),
    status: String(u.status ?? ""),
    is_email_verified: Boolean(u.is_email_verified),
    profile: u.profile != null && typeof u.profile === "object" ? (u.profile as Record<string, unknown>) : null,
  };
}

function extractItems(data: unknown): ManagementUser[] {
  if (Array.isArray(data)) {
    return data.map(mapUser);
  }
  if (data && typeof data === "object") {
    const o = data as StaffListResponse | ManagerListResponse;
    if (Array.isArray(o.items)) {
      return o.items.map(mapUser);
    }
  }
  return [];
}

export async function listStaff(): Promise<ManagementUser[]> {
  const { data } = await axios.get<unknown>("/management/staff");
  return extractItems(data);
}

export async function createStaff(body: CreateStaffBody): Promise<MessageUserResponse> {
  const { data } = await axios.post<MessageUserResponse>("/management/staff", body);
  return data;
}

export async function updateStaff(id: string, body: UpdateStaffBody): Promise<MessageUserResponse> {
  const { data } = await axios.put<MessageUserResponse>(`/management/staff/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteStaff(id: string): Promise<MessageResponse> {
  const { data } = await axios.delete<MessageResponse>(`/management/staff/${encodeURIComponent(id)}`);
  return data;
}

export async function listManagers(): Promise<ManagementUser[]> {
  const { data } = await axios.get<unknown>("/management/managers");
  return extractItems(data);
}

export async function createManager(body: CreateManagerBody): Promise<MessageUserResponse> {
  const { data } = await axios.post<MessageUserResponse>("/management/managers", body);
  return data;
}

export async function updateManager(id: string, body: UpdateManagerBody): Promise<MessageUserResponse> {
  const { data } = await axios.put<MessageUserResponse>(`/management/managers/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteManager(id: string): Promise<MessageResponse> {
  const { data } = await axios.delete<MessageResponse>(`/management/managers/${encodeURIComponent(id)}`);
  return data;
}
