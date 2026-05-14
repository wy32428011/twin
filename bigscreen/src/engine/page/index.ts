/**
 * 子页面管理
 */
import { ComponentNodeType, JsonTypePage } from "@/engine";
import { setItem, getItem, removeItem } from "@/utils";

type Listener = (pages: JsonTypePage[]) => void;
type ListenerUnmount = () => void;

export interface PageComponentData {
  pageId: string;
  pageName: string;
  components: ComponentNodeType[];
  globalComponents: Record<string, ComponentNodeType>;
  lastModified: number;
}

export default class Page {
  // pages
  private pages: JsonTypePage[] = []; // 存储pages;
  private listeners: Listener[] = [];
  // private currentPageId: string | null = null; // 当前选中的页面ID
  private globalComponentNodes: Record<string, ComponentNodeType> = {}; // 所有全局组件(即全页面展示的组件)

  private saveToLocal() {
    setItem('pagesTree', this.pages);
  }
  
  private loadFromLocal(): JsonTypePage[] | null {
    const data = getItem('pagesTree');
    return data ? data : null;
  }

  // 保存单个页面的组件数据
  public savePageComponents(pageId: string, components: ComponentNodeType[]): void {
    const page = this.get(pageId);
    if (!page) return;
    
    const pageData: PageComponentData = {
      pageId,
      pageName: page.name,
      components: components.filter(comp => !comp.isAllPage), // 过滤掉全局组件
      globalComponents: this.extractGlobalComponents(components), // 提取全局组件
      lastModified: Date.now()
    };
    
    setItem(`page_data_${pageId}`, pageData);
  }
  
  // 加载单个页面的组件数据
  public loadPageComponents(pageId: string): ComponentNodeType[] {
    const data: PageComponentData | null = getItem(`page_data_${pageId}`);
    if (!data) return [];
    
    // 合并页面组件和全局组件
    const allComponents = [...data.components];
    if (data.globalComponents) {
      Object.values(data.globalComponents).forEach(comp => {
        comp.isAllPage = true; // 标记为全局组件
        allComponents.push(comp);
      });
    }
    
    return allComponents;
  }

  // 从组件列表中提取全局组件
  private extractGlobalComponents(components: ComponentNodeType[]): Record<string, ComponentNodeType> {
    const globalComps: Record<string, ComponentNodeType> = {};
    components.forEach(comp => {
      if (comp.isAllPage) {
        globalComps[comp.id] = comp;
      }
    });
    return globalComps;
  }

  // 触发pages变更
  private notifyChange() {
    const pages = this.getAll();
    this.listeners.forEach((cb) => {
      cb(pages);
    });
  }

  // 将组件从globalComponents中移除
  public removeGlobalComponentNode(
    componentNodeId?: string | ComponentNodeType | (string | ComponentNodeType)[],
  ) {
    const list = Array.isArray(componentNodeId) ? componentNodeId : [componentNodeId];
    list.forEach((item) => {
      const id = typeof item === "string" ? item : item?.id;
      if (id) {
        delete this.globalComponentNodes[id];
      }
    });
  }

  // 更新 page
  public update(pageId?: string, extPage?: Partial<JsonTypePage>) {
    if (!pageId || !extPage) return;
    this.pages.some((page) => {
      const isFind = page.id === pageId;
      if (isFind) {
        Object.assign(page, extPage);
        this.saveToLocal(); // 保存到本地
        this.notifyChange();
      }
      return isFind;
    });
  }

  // 监听pages变更
  public onChange(listener: Listener): ListenerUnmount {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((cb) => {
        return cb !== listener;
      });
    };
  }

  // 初始化pages
  public init(componentNodes: ComponentNodeType[] = [], pages: JsonTypePage[] = []) {
    // 优先从本地存储加载
    const localPages = this.loadFromLocal();

    this.pages = pages?.length ? pages : (localPages || []);
    // 只有在有本地页面数据并且有组件时，才初始化组件
    if (this.pages && componentNodes.length > 0) {
      // 获取当前页面ID
      const currentPageId = this.getCurrentPageIdFromStorage();
      if (currentPageId) {
        this.savePageComponents(currentPageId, componentNodes);
      }
    }
    this.saveToLocal(); // 保存到本地
    this.notifyChange();
  }

  // 从存储中获取当前页面ID
  private getCurrentPageIdFromStorage(): string | null {
    return getItem('current_page_id');
  }
  
  // 保存当前页面ID到存储
  public saveCurrentPageId(pageId: string | null): void {
    if (pageId) {
      setItem('current_page_id', pageId);
    } else {
      removeItem('current_page_id');
    }
  }

  // 获取指定页面 pageId 的 componentNodes
  public getComponentNodes(
    pageId?: string | JsonTypePage,
    omitGlobal?: boolean,
  ): ComponentNodeType[] {
    if (!pageId) return [];

    const targetPageId = typeof pageId === "string" ? pageId : pageId?.id;
    if (!targetPageId) return [];

    // 此处local模拟 后期直接从后端接口获取当前页面存储的组件数据
    const data: PageComponentData | null = getItem(`page_data_${targetPageId}`);
    if (!data) return [];

    if (omitGlobal) {
      return [...data.components];
    } else {
      // 合并页面组件和全局组件
      const allComponents = [...data.components];
      if (data.globalComponents) {
        Object.values(data.globalComponents).forEach(comp => {
          comp.isAllPage = true;
          allComponents.push(comp);
        });
      }
      return allComponents;
    }
  }

  // 设置页面的 componentNodes
  public setComponentNodes(pageId?: string | JsonTypePage, componentNodes?: ComponentNodeType[]) {
    if (!pageId || !componentNodes) return;

    const targetPageId = typeof pageId === "string" ? pageId : pageId?.id;
    if (!targetPageId) return;
    
    this.savePageComponents(targetPageId, componentNodes);
  }

  // 获取某个page
  public get(pageId?: string): JsonTypePage | undefined {
    if (!pageId) return undefined;
    return this.pages.find((page) => page.id === pageId);
  }

  // 获取所有pages
  public getAll(): JsonTypePage[] {
    return this.pages;
  }

  // 插入一个新页面
  public insert(page: JsonTypePage, parentId?: string | JsonTypePage) {
    // this.pageMap[page.id] = { children: [] };
    if (!parentId) {
      this.pages.push(page);
    } else {
      parentId = typeof parentId === "string" ? parentId : parentId.id;
      const parentIndex = this.pages.findIndex((item) => item.id === parentId);
      if (parentIndex >= 0) {
        this.pages.splice(parentIndex + 1, 0, page);
      }
    }

    // 创建页面的空数据存储
    const pageData: PageComponentData = {
      pageId: page.id,
      pageName: page.name,
      components: [],
      globalComponents: {},
      lastModified: Date.now()
    };
    
    setItem(`page_data_${page.id}`, pageData);
    
    this.saveToLocal(); // 保存到本地
    this.notifyChange();
  }

  // 获取所有 componentNodes
  public getAllComponentNodes(): ComponentNodeType[] {
    return this.pages.reduce((list, page) => {
      return list.concat(this.getComponentNodes(page, true));
    }, [] as ComponentNodeType[]);
  }

  // 删除页面
  public delete(pageId?: string | string[]) {
    if (!pageId) return;
    const pageIds = Array.isArray(pageId) ? pageId : [pageId];
    // 删除页面对应的数据
    pageIds.forEach(id => {
      removeItem(`page_data_${id}`);
    });
    
    // 从页面列表中移除
    this.pages = this.pages.filter((page) => {
      return !pageIds.includes(page.id);
    });
    this.saveToLocal(); // 保存到本地
    this.notifyChange();
  }
}
