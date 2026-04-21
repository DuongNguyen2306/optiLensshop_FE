export type StaffAssignableRole = "sales" | "operations" | "manager";

export type UserStatus = "active" | "inactive" | "banned" | "pending";

export interface ManagementUser {
  id: string;
  email: string;
  role: string;
  status: string;
  is_email_verified: boolean;
  profile?: Record<string, unknown> | null;
}

export interface StaffListResponse {
  items: ManagementUser[];
}

export interface ManagerListResponse {
  items: ManagementUser[];
}

export interface CreateStaffBody {
  email: string;
  password: string;
  role: StaffAssignableRole;
  status?: UserStatus;
}

export interface UpdateStaffBody {
  role?: StaffAssignableRole;
  status?: UserStatus;
}

export interface CreateManagerBody {
  email: string;
  password: string;
  status?: UserStatus;
}

export interface UpdateManagerBody {
  status: UserStatus;
}

export interface MessageUserResponse {
  message?: string;
  user?: ManagementUser;
}

export interface MessageResponse {
  message?: string;
}
