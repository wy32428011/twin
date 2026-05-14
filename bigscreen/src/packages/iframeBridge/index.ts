/**
 * iframeBridge - 父子窗口通信模块
 * @description 用于大屏页面与3D项目（父窗口）之间的双向通信
 */

// 消息类型
export type MessageType =
  | "DEVICE_ID_CHANGE"    // 设备ID变化
  | "DATASOURCE_UPDATE"   // 数据源更新
  | "COMPONENT_TRIGGER"   // 组件触发事件
  | "PAGE_READY"          // 页面就绪
  | "REQUEST_DATA"        // 请求数据
  | "RESPONSE_DATA";      // 返回数据

// 消息结构
export interface IframeMessage<T = any> {
  type: MessageType;
  payload: T;
  timestamp: number;
  source: string;
}

// 设备ID变化消息
export interface DeviceIdChangePayload {
  deviceId: string;
  deviceName?: string;
  extra?: Record<string, any>;
}

// 数据源更新消息
export interface DataSourceUpdatePayload {
  dataSourceKey: string;
  data: any;
}

// 组件触发消息
export interface ComponentTriggerPayload {
  componentId: string;
  triggerId: string;
  payload: any;
}

// 消息处理函数类型
export type MessageHandler<T = any> = (payload: T, rawMessage: IframeMessage) => void;

// 默认来源标识
const DEFAULT_SOURCE = "react-big-screen";

class IframeBridge {
  private static instance: IframeBridge;
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private source: string = DEFAULT_SOURCE;
  private parentWindow: Window | null = null;

  static getInstance(): IframeBridge {
    if (!IframeBridge.instance) {
      IframeBridge.instance = new IframeBridge();
    }
    return IframeBridge.instance;
  }

  /**
   * 初始化
   * @param source 标识来源
   */
  init(source: string = DEFAULT_SOURCE) {
    this.source = source;
    this.parentWindow = window.parent;

    // 监听来自父窗口的消息
    window.addEventListener("message", this.handleMessage.bind(this));

    // 通知父窗口页面已就绪
    this.sendMessage("PAGE_READY", { ready: true });
  }

  /**
   * 销毁
   */
  destroy() {
    window.removeEventListener("message", this.handleMessage.bind(this));
    this.handlers.clear();
  }

  /**
   * 发送消息给父窗口
   */
  sendMessage<T>(type: MessageType, payload: T) {
    if (!this.parentWindow || this.parentWindow === window) {
      console.warn("[iframeBridge] parent window not available");
      return;
    }

    const message: IframeMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      source: this.source,
    };

    this.parentWindow.postMessage(message, "*");
  }

  /**
   * 监听消息
   */
  on<T>(type: MessageType, handler: MessageHandler<T>) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    // 返回取消订阅函数
    return () => this.off(type, handler);
  }

  /**
   * 取消监听
   */
  off<T>(type: MessageType, handler: MessageHandler<T>) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as MessageHandler);
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(event: MessageEvent) {
    const message = event.data as IframeMessage;
    if (!message?.type) return;

    // 忽略自己发送的消息
    if (message.source === this.source) return;

    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.payload, message);
        } catch (e) {
          console.error(`[iframeBridge] handler error for ${message.type}:`, e);
        }
      });
    }
  }

  // ============ 便捷方法 ============

  /**
   * 通知设备ID变化
   */
  notifyDeviceChange(deviceId: string, deviceName?: string, extra?: Record<string, any>) {
    this.sendMessage<DeviceIdChangePayload>("DEVICE_ID_CHANGE", {
      deviceId,
      deviceName,
      extra,
    });
  }

  /**
   * 通知数据源更新
   */
  notifyDataSourceUpdate(dataSourceKey: string, data: any) {
    this.sendMessage<DataSourceUpdatePayload>("DATASOURCE_UPDATE", {
      dataSourceKey,
      data,
    });
  }

  /**
   * 通知组件触发事件
   */
  notifyComponentTrigger(componentId: string, triggerId: string, payload: any) {
    this.sendMessage<ComponentTriggerPayload>("COMPONENT_TRIGGER", {
      componentId,
      triggerId,
      payload,
    });
  }

  /**
   * 请求数据（向父窗口请求）
   */
  requestData<T = any>(dataKey: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 设置超时
      const timeout = setTimeout(() => {
        this.off("RESPONSE_DATA", handler);
        reject(new Error(`Request ${requestId} timeout`));
      }, 10000);

      // 监听响应
      const handler = (payload: any, message: IframeMessage) => {
        if (payload?.requestId === requestId) {
          clearTimeout(timeout);
          this.off("RESPONSE_DATA", handler);
          resolve(payload.data);
        }
      };

      this.on("RESPONSE_DATA", handler);

      // 发送请求
      this.sendMessage("REQUEST_DATA", { requestId, dataKey });
    });
  }
}

// 导出单例
export const iframeBridge = IframeBridge.getInstance();

// 导出类
export { IframeBridge };
export default iframeBridge;