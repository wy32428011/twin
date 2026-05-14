/**
 * @description 判断是否是json类型
 * @param data
 * @returns
 */
const isJsonType = (data: any) => {
  if (typeof data === 'string') {
    try {
      JSON.parse(data)
      return true
    } catch (error) {
      return false
    }
  }
}
/**
 * @description 存储local
 * @param key
 * @param value
 * @returns
 */
export function setItem(key: string, value: any) {
  const _value = typeof value === 'string' ? value : JSON.stringify(value)
  return localStorage.setItem(key, _value)
}

// 读取local
export const getItem = (key: string) => {
  const data = localStorage.getItem(key)
  if (!data) return ''
  return isJsonType(data) ? JSON.parse(data) : data
}

// 清除特定local
export const removeItem = (key: string) => {
  return localStorage.removeItem(key)
}

// 清空local
export const removeAllItem = () => {
  return localStorage.clear()
}