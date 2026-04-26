# FE-duong (Vite + React)

## Biến môi trường API

Base URL REST: `VITE_API_BASE_URL` hoặc `VITE_API_URL`, hoặc `NEXT_PUBLIC_API_BASE_URL` (tương thích tên kiểu Next). Xem `.env.example`.

## Quản trị catalog (admin)

**Catalog admin chỉ dành cho tài khoản có role `manager` hoặc `admin`.** User `customer`, `sales`, `operations` không được gọi các endpoint ghi của catalog trên BE (403); trên FE, menu **Quản lý catalog** chỉ hiện với `manager`/`admin`, route `/admin/catalog/*` được bảo vệ và redirect về trang chủ kèm thông báo nếu không đủ quyền.

Sau đăng nhập, nếu user mở trực tiếp URL quản trị catalog rồi bị chuyển tới `/login`, sau khi đăng nhập thành công hệ thống sẽ quay lại URL đó **chỉ khi** role là `manager` hoặc `admin`.

## Kiểm thử tay (checklist)

1. Đăng nhập **customer** → gọi thao tác tạo danh mục (hoặc dùng Postman/cURL `POST /categories` với token customer) → **403**.
2. Đăng nhập **manager** → `POST /brands`, `POST /models`, `POST /categories`, `POST /products` (multipart hợp lệ) → **201** khi dữ liệu hợp lệ.
3. Đăng nhập **admin** → các thao tác trên giống manager.

## Backend (email xác thực)

Trên server BE, cấu hình `APP_BASE_URL` là origin FE (ví dụ `http://localhost:5173`) để link trong email trỏ đúng màn xác thực.
