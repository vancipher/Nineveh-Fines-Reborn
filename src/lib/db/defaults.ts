export const DEFAULT_ADMIN_USERNAME = 'QaisHassan';
export const DEFAULT_ADMIN_EMAIL = 'QaisHassan@nineveh-traffic.local';
export const DEFAULT_ADMIN_PASSWORD = '£E=d.?Q)S`5W04TAYO^iHDJ;]s2_KHm,Ipq';

export function resolveAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL,
    username: process.env.ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
  };
}
