/**
 * 打开路由新页面
 * @param routePath 路由地址
 * @param unique 是否打开唯一页面
 */
export function openRoute(routePath: string, unique: boolean = true) {
  if (!routePath.startsWith("/")) {
    routePath = `/${routePath}`;
  }

  if (!unique) {
    window.open(routePath);
    return;
  }

  // 直接跳转
  window.location.href = routePath;
}