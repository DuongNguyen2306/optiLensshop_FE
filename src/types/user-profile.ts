export interface UserAddress {
  _id?: string;
  id?: string;
  label?: string;
  receiver_name?: string;
  receiver_phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  address_line?: string;
  full_address?: string;
  is_default?: boolean;
  [key: string]: unknown;
}

export interface CreateAddressBody {
  label?: string;
  receiver_name?: string;
  receiver_phone?: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  ward?: string;
  address_line: string;
  street?: string;
  address?: string;
  full_address?: string;
  is_default?: boolean;
}
