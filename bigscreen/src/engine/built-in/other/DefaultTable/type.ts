// table/attributes.ts
import { TextAlignType } from '@/components/Attributes';

export interface TableColumn {
  id: string; // 列唯一标识
  label: string; // 列标题
  key: string; // 数据字段key
  width?: number; // 列宽
  textAlign?: TextAlignType; // 对齐方式
  show?: boolean; // 是否显示
}

export interface TableOptions {
  // 基本设置
  hidden?: boolean; // 是否隐藏
  enableRanking?: boolean; // 开启排名
  enableScroll?: boolean; // 开启滚动
  scrollInterval?: number; // 滚动间隔（秒）
  scrollSpeed?: number; // 滚动速度（px/s）
  
  // 表头设置
  showHeader?: boolean; // 显示表头
  headerFontSize?: number; // 表头字号
  headerBackground?: string; // 表头背景色
  headerColor?: string; // 表头文字颜色
  headerTextAlign?: TextAlignType; // 表头对齐方式
  
  // 表格设置
  showRows?: number; // 显示行数
  fontSize?: number; // 表格字体大小
  textAlign?: TextAlignType; // 表格对齐方式
  textColor?: string; // 文字颜色
  oddRowColor?: string; // 奇数行颜色
  evenRowColor?: string; // 偶数行颜色
  rowHeight?: number; // 行高
  
  // 数据相关
  columns?: TableColumn[]; // 列配置
  data?: Record<string, any>[]; // 表格数据（静态）
  dataUrl?: string; // 数据接口URL
  pollingInterval?: number; // 轮询间隔（秒）
  
  // 分页设置
  pagination?: boolean; // 是否分页
  pageSize?: number; // 每页显示条数
}

export const DEFAULT_OPTIONS: TableOptions = {
  showHeader: true,
  headerFontSize: 14,
  headerBackground: 'rgba(0, 0, 0, 0)',
  headerColor: '#fff',
  headerTextAlign: 'center',
  
  showRows: 4,
  fontSize: 14,
  textAlign: 'center',
  textColor: '#fff',
  oddRowColor: 'rgba(0, 0, 0, 0)',
  evenRowColor: 'rgba(0, 0, 0, 0.16)',
  rowHeight: 40,
  
  enableScroll: false,
  scrollInterval: 1,
  scrollSpeed: 50,
  
  enableRanking: false,

  columns: [
    { id: '1', label: '列1', key: 'type1', show: true },
    { id: '2', label: '列2', key: 'type2', show: true },
    { id: '3', label: '列3', key: 'type3', show: true },
    { id: '4', label: '列4', key: 'type4', show: true },
  ],
  data: [
    { type1: '数据1', type2: '数据1', type3: '数据2', type4: '数据6' },
    { type1: '数据3', type2: '数据3', type3: '数据4', type4: '数据4' },
    { type1: '数据3', type2: '数据3', type3: '数据4', type4: '数据4' },
    { type1: '数据3', type2: '数据3', type3: '数据4', type4: '数据4' },
  ],
  pagination: false,
  pageSize: 10,
};