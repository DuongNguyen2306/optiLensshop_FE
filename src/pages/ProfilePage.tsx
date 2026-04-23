import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  MapPin,
  ShoppingBag,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  ChevronRight,
  Camera,
  UserPen,
} from "lucide-react";
import StoreHeader from "@/components/home/store-header";
import SiteFooter from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { createMyAddress, getMyAddresses, getMyProfile } from "@/services/users.service";
import { changePassword, logout, updateProfile } from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { passwordSchema } from "@/lib/auth-validation";
import type { CreateAddressBody } from "@/types/user-profile";
import type { Province, District, Ward } from "sub-vn";

/* ─── schemas ─── */
const passwordFormSchema = z
  .object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    new_password: passwordSchema,
    confirm_new_password: passwordSchema,
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: "Mật khẩu mới không được trùng mật khẩu hiện tại.",
    path: ["new_password"],
  })
  .refine((d) => d.new_password === d.confirm_new_password, {
    message: "Xác nhận phải trùng mật khẩu mới.",
    path: ["confirm_new_password"],
  });

const profileFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại.")
    .regex(/^\d{9,11}$/, "Số điện thoại phải từ 9 đến 11 chữ số."),
  full_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ và tên.")
    .max(100, "Họ và tên tối đa 100 ký tự."),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "other", ""]).optional(),
});

type PasswordFormData = z.infer<typeof passwordFormSchema>;
type ProfileFormData = z.infer<typeof profileFormSchema>;

/* ─── animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: "easeOut" },
  }),
};

/* ─── helpers ─── */
function roleLabel(role: string | undefined): string {
  const map: Record<string, string> = {
    customer: "Khách hàng",
    admin: "Admin",
    manager: "Manager",
    sales: "Sales",
    operations: "Operations",
  };
  return map[(role ?? "").toLowerCase()] ?? (role ?? "");
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

const inputCls =
  "rounded-xl border-slate-200 bg-slate-50 focus:border-teal-400 focus:bg-white focus:ring-teal-400/20 transition";

function readPhoneFromUnknown(userLike: unknown): string {
  if (!userLike || typeof userLike !== "object") return "";
  const u = userLike as Record<string, unknown>;
  if (typeof u.phone === "string" && u.phone.trim()) return u.phone.trim();
  const profile = u.profile;
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, unknown>;
    if (typeof p.phone === "string" && p.phone.trim()) return p.phone.trim();
  }
  return "";
}

function readFullNameFromUnknown(userLike: unknown): string {
  if (!userLike || typeof userLike !== "object") return "";
  const u = userLike as Record<string, unknown>;
  if (typeof u.full_name === "string" && u.full_name.trim()) return u.full_name.trim();
  const first = typeof u.first_name === "string" ? u.first_name.trim() : "";
  const last = typeof u.last_name === "string" ? u.last_name.trim() : "";
  const merged = [first, last].filter(Boolean).join(" ").trim();
  if (merged) return merged;
  const profile = u.profile;
  if (profile && typeof profile === "object") {
    const p = profile as Record<string, unknown>;
    if (typeof p.full_name === "string" && p.full_name.trim()) return p.full_name.trim();
    const pf = typeof p.first_name === "string" ? p.first_name.trim() : "";
    const pl = typeof p.last_name === "string" ? p.last_name.trim() : "";
    return [pf, pl].filter(Boolean).join(" ").trim();
  }
  return "";
}

/* ─── Password section ─── */
function PasswordSection() {
  const dispatch = useAppDispatch();
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { current_password: "", new_password: "", confirm_new_password: "" },
  });
  const { isSubmitting } = form.formState;

  const onSubmit = async (values: PasswordFormData) => {
    try {
      const msg = await dispatch(changePassword(values)).unwrap();
      toast.success(msg);
      form.reset();
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Đổi mật khẩu thất bại.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {(
        [
          { id: "cp-current", label: "Mật khẩu hiện tại", field: "current_password" as const, auto: "current-password" },
          { id: "cp-new", label: "Mật khẩu mới (5–64 ký tự)", field: "new_password" as const, auto: "new-password" },
          { id: "cp-confirm", label: "Xác nhận mật khẩu mới", field: "confirm_new_password" as const, auto: "new-password" },
        ] as const
      ).map(({ id, label, field, auto }) => (
        <div key={id}>
          <Label htmlFor={id} className="mb-1.5 text-sm font-medium text-slate-700">{label}</Label>
          <Input id={id} type="password" autoComplete={auto} className={inputCls} {...form.register(field)} />
          <FieldError msg={form.formState.errors[field]?.message} />
        </div>
      ))}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 rounded-xl bg-teal-500 px-6 text-white hover:bg-teal-600 active:scale-[0.98]"
      >
        {isSubmitting ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
      </Button>
    </form>
  );
}

/* ─── Profile Info section ─── */
function ProfileInfoSection() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((s) => s.auth);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: readFullNameFromUnknown(user),
      dob: user?.dob ?? "",
      phone: readPhoneFromUnknown(user),
      gender: (user?.gender as ProfileFormData["gender"]) ?? "",
    },
  });
  const { isSubmitting } = form.formState;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: ProfileFormData) => {
    try {
      await dispatch(
        updateProfile({
          full_name: values.full_name.trim(),
          dob: values.dob,
          phone: values.phone.trim(),
          gender: values.gender || undefined,
          avatar: avatarFile ?? undefined,
        })
      ).unwrap();
      toast.success("Cập nhật hồ sơ thành công!");
      await queryClient.invalidateQueries({ queryKey: ["users", "my-profile"] });
      setAvatarFile(null);
    } catch (e) {
      toast.error(typeof e === "string" ? e : "Cập nhật thất bại.");
    }
  };

  const displayAvatar = avatarPreview ?? user?.avatar_url ?? null;
  const initial = (user?.email ?? "U").charAt(0).toUpperCase();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Avatar picker */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {displayAvatar ? (
            <img src={displayAvatar} alt="avatar" className="h-16 w-16 rounded-full object-cover ring-2 ring-teal-200" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl font-bold text-white">
              {initial}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white shadow ring-2 ring-white transition hover:bg-teal-600"
            title="Đổi ảnh đại diện"
          >
            <Camera className="h-3 w-3" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">Ảnh đại diện</p>
          <p className="text-xs text-slate-500">JPG, PNG tối đa 5MB</p>
        </div>
      </div>

      {/* Phone + Name */}
      <div>
        <Label htmlFor="pi-phone" className="mb-1.5 text-sm font-medium text-slate-700">Số điện thoại</Label>
        <Input id="pi-phone" className={inputCls} placeholder="09xxxxxxxx" {...form.register("phone")} />
        <FieldError msg={form.formState.errors.phone?.message} />
      </div>

      {/* Full name */}
      <div>
        <Label htmlFor="pi-full-name" className="mb-1.5 text-sm font-medium text-slate-700">Họ và tên</Label>
        <Input id="pi-full-name" className={inputCls} placeholder="Nguyễn Văn A" {...form.register("full_name")} />
        <FieldError msg={form.formState.errors.full_name?.message} />
      </div>

      {/* DOB + Gender */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pi-dob" className="mb-1.5 text-sm font-medium text-slate-700">Ngày sinh</Label>
          <Input id="pi-dob" type="date" className={inputCls} {...form.register("dob")} />
        </div>
        <div>
          <Label htmlFor="pi-gender" className="mb-1.5 text-sm font-medium text-slate-700">Giới tính</Label>
          <select
            id="pi-gender"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20"
            {...form.register("gender")}
          >
            <option value="">Không chọn</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-teal-500 px-6 text-white hover:bg-teal-600 active:scale-[0.98]"
      >
        {isSubmitting ? "Đang lưu…" : "Lưu thay đổi"}
      </Button>
    </form>
  );
}

/* ─── Address section ─── */
function AddressSection({ onRequirePhone }: { onRequirePhone: () => void }) {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [allProvinces, setAllProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [loadingAddressOptions, setLoadingAddressOptions] = useState(false);
  const [form, setForm] = useState<CreateAddressBody>({
    label: "Nhà",
    province: "",
    district: "",
    ward: "",
    address_line: "",
    is_default: false,
  });

  useEffect(() => {
    setLoadingAddressOptions(true);
    void import("sub-vn")
      .then((subVn) => {
        setAllProvinces(subVn.getProvinces());
      })
      .finally(() => setLoadingAddressOptions(false));
  }, []);

  const handleProvinceChange = (code: string) => {
    setProvinceCode(code);
    setDistrictCode("");
    setWards([]);
    setForm((prev) => ({ ...prev, province: "", district: "", ward: "" }));
    void import("sub-vn").then((subVn) => {
      const found = allProvinces.find((p) => p.code === code);
      setDistricts(code ? subVn.getDistrictsByProvinceCode(code) : []);
      setForm((prev) => ({ ...prev, province: found?.name ?? "" }));
    });
  };

  const handleDistrictChange = (code: string) => {
    setDistrictCode(code);
    setForm((prev) => ({ ...prev, district: "", ward: "" }));
    void import("sub-vn").then((subVn) => {
      const found = districts.find((d) => d.code === code);
      setWards(code ? subVn.getWardsByDistrictCode(code) : []);
      setForm((prev) => ({ ...prev, district: found?.name ?? "" }));
    });
  };

  const handleWardChange = (wardName: string) => {
    setForm((prev) => ({ ...prev, ward: wardName }));
  };

  const addressesQuery = useQuery({
    queryKey: ["users", "my-addresses"],
    queryFn: () => getMyAddresses(),
  });
  const profileQuery = useQuery({
    queryKey: ["users", "my-profile"],
    queryFn: () => getMyProfile(),
  });

  const addAddressMutation = useMutation({
    mutationFn: (payload: CreateAddressBody) => createMyAddress(payload),
    onSuccess: async () => {
      toast.success("Đã thêm địa chỉ mới.");
      await queryClient.invalidateQueries({ queryKey: ["users", "my-addresses"] });
      setOpenForm(false);
      setForm({
        label: "Nhà",
        province: "",
        district: "",
        ward: "",
        address_line: "",
        is_default: false,
      });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Không thể thêm địa chỉ.")),
  });

  const addresses = addressesQuery.data ?? [];
  const profilePhone = readPhoneFromUnknown(profileQuery.data);
  const hasPhone = profilePhone.length > 0;

  const submitAddress = () => {
    if (!hasPhone) {
      toast.error("Bạn cần cập nhật số điện thoại trong Hồ sơ trước khi thêm địa chỉ.");
      onRequirePhone();
      return;
    }
    if (!form.address_line.trim()) {
      toast.error("Vui lòng nhập địa chỉ cụ thể.");
      return;
    }
    if (!form.province || !form.district || !form.ward) {
      toast.error("Vui lòng chọn đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã.");
      return;
    }
    const fullAddress = [form.address_line.trim(), form.ward, form.district, form.province]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(", ");
    const payload: CreateAddressBody = { address: fullAddress, address_line: form.address_line.trim() };
    addAddressMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {!hasPhone ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-amber-800">Cần cập nhật số điện thoại trước</p>
          <p className="mt-1 text-xs text-amber-700">
            Theo quy trình hệ thống, bạn phải có số điện thoại trong Hồ sơ rồi mới thêm địa chỉ giao hàng.
          </p>
          <Button
            type="button"
            className="mt-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
            onClick={onRequirePhone}
          >
            Đi tới tab Hồ sơ
          </Button>
        </div>
      ) : null}
      {openForm && hasPhone ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">Thêm địa chỉ mới</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              className={inputCls}
              placeholder="Nhãn (Nhà/Công ty)"
              value={form.label ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />
            <div />
            <select
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:bg-slate-100"
              value={provinceCode}
              disabled={loadingAddressOptions}
              onChange={(e) => handleProvinceChange(e.target.value)}
            >
              <option value="">{loadingAddressOptions ? "Đang tải dữ liệu..." : "Chọn Tỉnh/Thành"}</option>
              {allProvinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:bg-slate-100"
              value={districtCode}
              disabled={!provinceCode}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              <option value="">Chọn Quận/Huyện</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:bg-slate-100"
              value={form.ward ?? ""}
              disabled={!districtCode}
              onChange={(e) => handleWardChange(e.target.value)}
            >
              <option value="">Chọn Phường/Xã</option>
              {wards.map((w) => (
                <option key={w.code} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            className={`${inputCls} mt-3`}
            placeholder="Số nhà, tên đường..."
            value={form.address_line}
            onChange={(e) => setForm((prev) => ({ ...prev, address_line: e.target.value }))}
          />
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.is_default)}
              onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
            />
            Đặt làm địa chỉ mặc định
          </label>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              className="rounded-xl bg-teal-500 text-white hover:bg-teal-600"
              onClick={submitAddress}
              disabled={addAddressMutation.isPending}
            >
              {addAddressMutation.isPending ? "Đang lưu..." : "Lưu địa chỉ"}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpenForm(false)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : null}

      {addressesQuery.isPending || profileQuery.isPending ? (
        <p className="text-sm text-slate-500">Đang tải địa chỉ...</p>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <MapPin className="h-6 w-6 text-teal-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Chưa có địa chỉ nào</p>
          <p className="mt-1 text-xs text-slate-500">Thêm địa chỉ giao hàng để thanh toán nhanh hơn.</p>
          <button
            type="button"
            className="mt-4 rounded-full bg-teal-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"
            onClick={() => {
              if (!hasPhone) {
                onRequirePhone();
                return;
              }
              setOpenForm(true);
            }}
          >
            + Thêm địa chỉ
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {addresses.map((addr, i) => {
              const id = String(addr._id ?? addr.id ?? i);
              const fullFromParts = [addr.address_line, addr.ward, addr.district, addr.province].filter(Boolean).join(", ");
              const full = String((addr.address ?? addr.full_address ?? fullFromParts) || "—");
              return (
                <li key={id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{String(addr.label ?? "Địa chỉ giao hàng")}</p>
                    {addr.is_default ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Mặc định</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-slate-600">{full}</p>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="rounded-full border border-teal-200 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
            onClick={() => {
              if (!hasPhone) {
                onRequirePhone();
                return;
              }
              setOpenForm(true);
            }}
          >
            + Thêm địa chỉ mới
          </button>
        </>
      )}
    </div>
  );
}

/* ─── main page ─── */
export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<"info" | "password" | "address">("info");

  const isCustomer = (user?.role ?? "").toLowerCase() === "customer";
  const initial = (user?.email ?? "U").charAt(0).toUpperCase();
  const displayName = readFullNameFromUnknown(user) || user?.email?.split("@")[0] || "—";

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Đã đăng xuất.");
    navigate("/login", { replace: true });
  };

  const tabs = [
    { key: "info" as const, label: "Hồ sơ", icon: UserPen },
    { key: "password" as const, label: "Mật khẩu", icon: KeyRound },
    { key: "address" as const, label: "Địa chỉ", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <StoreHeader />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left: User Summary ── */}
          <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp} className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="h-20 w-20 rounded-full object-cover shadow-md" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-3xl font-bold text-white shadow-md">
                      {initial}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white">
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </span>
                </div>

                <p className="text-base font-semibold text-slate-900">{displayName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user?.email}</p>

                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {user?.is_email_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Đã xác thực
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Chưa xác thực
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                    <ShieldCheck className="h-3 w-3" />
                    {roleLabel(user?.role)}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate text-xs">{user?.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="text-xs">{roleLabel(user?.role)}</span>
                </div>
                {user?.gender ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="h-4 w-4 shrink-0 text-center text-xs text-slate-400">♂♀</span>
                    <span className="text-xs capitalize">
                      {user.gender === "male" ? "Nam" : user.gender === "female" ? "Nữ" : "Khác"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              {isCustomer && (
                <Link
                  to="/orders"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-teal-500" />
                    Đơn hàng của tôi
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </span>
                <ChevronRight className="h-4 w-4 text-red-300" />
              </button>
            </div>
          </motion.div>

          {/* ── Right: Tabs ── */}
          <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp} className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {/* Tab bar */}
              <div className="flex border-b border-slate-100">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-medium transition sm:text-sm ${
                      activeTab === key
                        ? "border-b-2 border-teal-500 text-teal-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === "info" && (
                  <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <div className="mb-5 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                        <UserPen className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">Thông tin cá nhân</h2>
                        <p className="text-xs text-slate-500">Cập nhật ảnh đại diện, họ tên, ngày sinh và giới tính.</p>
                      </div>
                    </div>
                    <ProfileInfoSection />
                  </motion.div>
                )}

                {activeTab === "password" && (
                  <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <div className="mb-5 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                        <Lock className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">Đổi mật khẩu</h2>
                        <p className="text-xs text-slate-500">Mật khẩu mới 5–64 ký tự, không trùng mật khẩu hiện tại.</p>
                      </div>
                    </div>
                    <PasswordSection />
                  </motion.div>
                )}

                {activeTab === "address" && (
                  <motion.div key="address" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <div className="mb-5 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                        <MapPin className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">Sổ địa chỉ</h2>
                        <p className="text-xs text-slate-500">Quản lý địa chỉ giao hàng của bạn.</p>
                      </div>
                    </div>
                    <AddressSection onRequirePhone={() => setActiveTab("info")} />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
