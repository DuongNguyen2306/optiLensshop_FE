declare module "sub-vn" {
  export interface Province {
    code: string;
    name: string;
    unit: string;
  }

  export interface District {
    code: string;
    name: string;
    unit: string;
    province_code: string;
    province_name: string;
    full_name: string;
  }

  export interface Ward {
    code: string;
    name: string;
    unit: string;
    district_code: string;
    district_name: string;
    province_code: string;
    province_name: string;
    full_name: string;
  }

  export function getProvinces(): Province[];
  export function getDistrictsByProvinceCode(provinceCode: string): District[];
  export function getWardsByDistrictCode(districtCode: string): Ward[];
}
