/**
 * 懒加载图片
 */

const assets = import.meta.glob("./assets/*.{png,jpg,jpeg}");

export async function getLazyImage(name?: string) {
  if (!name) return undefined;
  const key = `./assets/${name}`;
  const loader = assets[key];
  if (!loader) {
    console.warn(`[lazyImage] asset not found: ${key}`);
    return undefined;
  }
  return loader().then((module: any) => {
    return module?.default || undefined;
  });
}
