/**
 * Backend Sync Page Service
 * @description 大屏的后端同步模块
 */
import { ComponentNodeType, JsonTypePage } from "@/engine";
import Page from "@/engine/page";
import { getItem, setItem } from "@/utils";
import {
  getTreeData,
  createScreen,
  updateScreen,
  deleteScreen,
  getScreenDetail,
} from "./bigScreenApi";
import { isLocalDebug } from "./config";

export interface PageComponentData {
  pageId: string;
  pageName: string;
  components: ComponentNodeType[];
  globalComponents: Record<string, ComponentNodeType>;
  lastModified: number;
}

export default class PageBackendSync {
  // 底层页面管理实例
  private page: Page;
  // 是否启用后端同步
  private syncEnabled: boolean = false;
  // 是否已加载树数据
  private treeLoaded: boolean = false;

  constructor() {
    this.page = new Page();
  }

  // 启用后端同步
  public enableSync() {
    this.syncEnabled = true;
  }

  // 禁用后端同步
  public disableSync() {
    this.syncEnabled = false;
  }

  // 检查是否启用同步
  public isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  // ============ 树数据加载 ============

  /**
   * 加载树结构数据
   * @description 进入页面时调用此方法加载项目和页面树
   * @returns 返回是否成功加载
   */
  public async loadTreeData(): Promise<{ pages: JsonTypePage[]; success: boolean; error?: string }> {
    if (isLocalDebug()) {
      console.log("[PageBackendSync] Local debug mode, using local storage");
      const localData = this.loadFromLocalStorage();
      this.page.init([], localData);
      this.treeLoaded = true;
      return { pages: localData, success: true };
    }

    try {
      const response = await getTreeData();

      // 解析树数据
      let pages: JsonTypePage[] = [];
      if (Array.isArray(response?.data)) {
        pages = this.parseTreeData(response.data);
      }

      // 初始化 page 管理器
      this.page.init([], pages);
      this.saveToLocal(pages);
      this.treeLoaded = true;

      return { pages, success: true };
    } catch (error: any) {
      console.error("[PageBackendSync] Catch error:", error);
      console.error("[PageBackendSync] Catch error.message:", error?.message);
      // 失败时使用本地数据
      const localData = this.loadFromLocalStorage();
      this.page.init([], localData);
      this.treeLoaded = true;
      // 统一拦截器已经处理了错误信息，直接使用 error.message
      const errorMsg = error?.message || "加载失败";
      return { pages: localData, success: false, error: errorMsg };
    }
  }

  /**
   * 解析树数据
   * @description 将后端返回的树结构转换为 JsonTypePage[]
   */
  private parseTreeData(data: any[]): JsonTypePage[] {
    const pages: JsonTypePage[] = [];

    const parseNode = (node: any, parentId?: string) => {
      if (!node) return;

      const page: JsonTypePage = {
        id: String(node.id || node.key),
        name: node.name || node.title,
        parentId: parentId,
        options: {
          ...(node.options || {}),
          projectId: node.projectId,
        },
      };
      pages.push(page);

      // 递归处理子节点
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => parseNode(child, page.id));
      }
    };

    if (Array.isArray(data)) {
      data.forEach(item => parseNode(item));
    }

    return pages;
  }

  // ============ 大屏CRUD ============

  /**
   * 新增大屏
   */
  public async createScreenBackend(screenName: string, projectId: string): Promise<JsonTypePage | null> {
    if (isLocalDebug()) {
      const newPage: JsonTypePage = {
        id: this.generateId(),
        name: screenName,
        parentId: projectId,
        options: {},
      };
      this.page.insert(newPage, projectId);
      this.saveToLocal(this.page.getAll());
      return newPage;
    }

    try {
      const response = await createScreen({ screenName, projectId });
      if (response?.code === 200 || response?.success) {
        const newPageId = response.data?.id;
        if (!newPageId) {
          throw new Error("创建大屏失败：未返回ID");
        }
        const newPage: JsonTypePage = {
          id: String(newPageId),
          name: screenName,
          parentId: projectId,
          options: {},
        };
        this.page.insert(newPage, projectId);
        this.saveToLocal(this.page.getAll());
        return newPage;
      }
      return null;
    } catch (error: any) {
      console.error("[PageBackendSync] Failed to create screen:", error);
      // 重新抛出错误，让调用者能显示错误信息
      throw new Error(error?.message || "创建失败");
    }
  }

  /**
   * 更新大屏
   */
  public async updateScreenBackend(pageId: string, screenName: string): Promise<boolean> {
    console.log("[PageBackendSync] updateScreenBackend", pageId, screenName);
    if (isLocalDebug()) {
      this.page.update(pageId, { name: screenName });
      this.saveToLocal(this.page.getAll());
      return true;
    }

    try {
      const page = this.page.get(pageId);
      const projectId = page?.parentId;
      const response = await updateScreen({
        id: pageId,
        projectId: projectId || undefined,
        screenName,
      });
      if (response?.code === 200 || response?.success) {
        this.page.update(pageId, { name: screenName });
        this.saveToLocal(this.page.getAll());
        return true;
      }
      throw new Error(response?.message || "修改失败");
    } catch (error) {
      console.error("[PageBackendSync] Failed to update screen:", error);
      throw error;
    }
  }

  /**
   * 删除大屏
   */
  public async deleteScreenBackend(pageId: string): Promise<boolean> {
    if (isLocalDebug()) {
      this.page.delete(pageId);
      this.saveToLocal(this.page.getAll());
      return true;
    }

    try {
      const response = await deleteScreen(pageId);
      if (response?.code === 200 || response?.success) {
        this.page.delete(pageId);
        this.saveToLocal(this.page.getAll());
        return true;
      }
      return false;
    } catch (error) {
      console.error("[PageBackendSync] Failed to delete screen:", error);
      return false;
    }
  }

  // ============ 组件数据 ============

  /**
   * 保存大屏组件数据
   */
  public async saveScreenComponentsToBackend(screenId: string, components: ComponentNodeType[]): Promise<boolean> {
    // 本地也保存一份
    this.page.setComponentNodes(screenId, components);

    if (isLocalDebug()) {
      this.saveComponentsToLocal(screenId, components);
      return true;
    }

    try {
      const page = this.page.get(screenId);
      const screenName = page?.name || "";
      const jsonContent = JSON.stringify(components);
      const response = await updateScreen({
        id: screenId,
        projectId: page?.parentId || undefined,
        screenName,
        jsonContent,
      });
      return response?.code === 200 || response?.success;
    } catch (error) {
      console.error("[PageBackendSync] Failed to save screen components:", error);
      return false;
    }
  }

  /**
   * 加载大屏组件数据
   */
  public async loadScreenComponentsFromBackend(screenId: string): Promise<ComponentNodeType[]> {
    if (isLocalDebug()) {
      return this.loadComponentsFromLocal(screenId);
    }

    try {
      const response = await getScreenDetail(screenId);
      console.log("[PageBackendSync] getScreenDetail response:", response);
      if (response?.code === 200 || response?.success) {
        // jsonContent 是字符串，需要解析成数组
        const jsonContent = response.data?.jsonContent;
        let components: ComponentNodeType[] = [];
        if (typeof jsonContent === "string" && jsonContent) {
          try {
            components = JSON.parse(jsonContent);
          } catch (e) {
            console.error("[PageBackendSync] Failed to parse jsonContent:", e);
            components = [];
          }
        } else if (Array.isArray(jsonContent)) {
          components = jsonContent;
        }
        this.saveComponentsToLocal(screenId, components);
        return components;
      }
      return this.loadComponentsFromLocal(screenId);
    } catch (error) {
      console.error("[PageBackendSync] Failed to load screen components:", error);
      return this.loadComponentsFromLocal(screenId);
    }
  }

  // ============ 本地存储 ============

  private saveToLocal(pages: JsonTypePage[]) {
    setItem("pagesTree", pages);
  }

  private loadFromLocalStorage(): JsonTypePage[] {
    const data = getItem("pagesTree");
    return data || [];
  }

  private saveComponentsToLocal(screenId: string, components: ComponentNodeType[]) {
    const pageData: PageComponentData = {
      pageId: screenId,
      pageName: this.page.get(screenId)?.name || "",
      components,
      globalComponents: {},
      lastModified: Date.now(),
    };
    setItem(`screen_components_${screenId}`, pageData);
  }

  private loadComponentsFromLocal(screenId: string): ComponentNodeType[] {
    const data: PageComponentData | null = getItem(`screen_components_${screenId}`);
    return data?.components || [];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // ============ 代理方法 ============

  // 获取底层Page实例
  public getPageInstance(): Page {
    return this.page;
  }

  // 同步页面数据到外部Page实例（如 engine.page）
  public syncPagesTo(targetPage: Page) {
    const pages = this.page.getAll();
    targetPage.init([], pages);
  }

  // 获取所有页面
  public getAll(): JsonTypePage[] {
    return this.page.getAll();
  }

  // 获取指定页面
  public get(pageId?: string): JsonTypePage | undefined {
    return this.page.get(pageId);
  }

  // 监听变化
  public onChange(listener: (pages: JsonTypePage[]) => void): () => void {
    return this.page.onChange(listener);
  }

  // 判断树是否已加载
  public isTreeLoaded(): boolean {
    return this.treeLoaded;
  }
}

// 导出单例
export const pageBackendSync = new PageBackendSync();