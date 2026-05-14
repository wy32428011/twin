/**
 * 获取url查询参数
 */

export function getUrlQuery(url = window.location.href || "") {
  const urlQuery: Record<string, string> = {};
  const pairs = url.slice(url.indexOf("?") + 1).split("&");
  pairs.forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key) {
      urlQuery[key] = value;
    }
  });
  console.log("urlQuery", urlQuery);
  return urlQuery;
}
