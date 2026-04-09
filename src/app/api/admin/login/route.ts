import { apiError, apiSuccess } from '@/lib/api-response';
import { applyAdminSession, isAdminConfigured, verifyAdminCredentials } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return apiError('后台账号密码尚未配置，请先在环境变量中设置。', 503, 'ADMIN_NOT_CONFIGURED');
  }

  try {
    const body = await request.json();
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!verifyAdminCredentials(username, password)) {
      return apiError('用户名或密码错误。', 401, 'INVALID_CREDENTIALS');
    }

    const response = apiSuccess({ username }, '登录成功。');
    applyAdminSession(response, username);
    return response;
  } catch (error) {
    return apiError('登录失败。', 500, 'ADMIN_LOGIN_FAILED', error instanceof Error ? error.message : undefined);
  }
}
