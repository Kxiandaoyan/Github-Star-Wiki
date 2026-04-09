import { apiSuccess } from '@/lib/api-response';
import { clearAdminSession } from '@/lib/admin-auth';

export async function POST() {
  const response = apiSuccess(null, '已退出后台登录。');
  clearAdminSession(response);
  return response;
}
