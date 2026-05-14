import styles from "./index.module.less";
import { Button, message, Space, Tree, TreeDataNode, Dropdown, Menu } from "antd";
import { FileOutlined, ReloadOutlined, PlusOutlined, MoreOutlined } from "@ant-design/icons";
import { useEffect, useState, useMemo, useRef } from "react";
import { JsonTypePage, useCurrentPageId, usePages } from "@/engine";
import useAddPageDialog from "./components/AddPageDialog";
import { selectPage } from "@/packages/shortCutKeys";
import { useEngineContext } from "@/export/context";
import { pageBackendSync } from "@/services/pageBackendSync";

export default function () {
  const { engine } = useEngineContext();
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pages = usePages();
  const currentPage = useCurrentPageId();
  const isManualRefresh = useRef(false);

  // 刷新树数据
  const handleRefresh = () => {
    isManualRefresh.current = true;
    setLoading(true);
    pageBackendSync.loadTreeData().then((result) => {
      setLoading(false);
      if (result.success) {
        message.success("刷新成功");
        // 同步页面数据到 engine.page
        pageBackendSync.syncPagesTo(engine.page);
        // 刷新后：展开第一个有大屏的项目，并选中第一个大屏，加载其组件数据
        const allPages = pageBackendSync.getAll();
        const firstProject = allPages.find(p => !p.parentId);
        if (firstProject) {
          const firstScreen = allPages.find(p => p.parentId === firstProject.id);
          if (firstScreen) {
            const newExpandedKeys = [firstProject.id];
            setExpandedKeys(newExpandedKeys);
            // 同时更新 config 中的 expandedPageIds，保持一致性
            engine.config.setConfigSilently({ expandedPageIds: newExpandedKeys });
            setSelectedKeys([firstScreen.id]);
            selectPage(firstScreen.id);
          }
        }
      } else {
        message.error(result.error || "刷新失败");
      }
    });
  };

  // 页面加载时请求树接口
  useEffect(() => {
    pageBackendSync.loadTreeData().then((result) => {
      setLoading(false);
      if (result.success) {
        console.log("[Pages] 树数据加载成功");
        // 同步页面数据到 engine.page
        pageBackendSync.syncPagesTo(engine.page);

        // 只有手动刷新才默认选中第一个大屏，组件挂载时保持当前选中
        if (isManualRefresh.current) {
          isManualRefresh.current = false;
          const allPages = pageBackendSync.getAll();
          const firstProject = allPages.find(p => !p.parentId);
          if (firstProject) {
            const firstScreen = allPages.find(p => p.parentId === firstProject.id);
            if (firstScreen) {
              const newExpandedKeys = [firstProject.id];
              setExpandedKeys(newExpandedKeys);
              engine.config.setConfigSilently({ expandedPageIds: newExpandedKeys });
              setSelectedKeys([firstScreen.id]);
              selectPage(firstScreen.id);
            }
          }
        }
      } else {
        message.error(result.error || "加载失败");
      }
    });
  }, []);

  // 新增/编辑弹窗
  const addPageDialog = useAddPageDialog({
    onOk({ page, parentId, mode }) {
      console.log("[Pages] 新增/修改大屏", page);
      if (mode === 'edit') {
        // 修改大屏名称
        pageBackendSync.updateScreenBackend(page.id, page.name).then(() => {
          message.success("修改成功");
          // 同步更新 engine.page，使树节点名称更新
          engine.page.update(page.id, { name: page.name });
        }).catch((error) => {
          message.error(error.message || "修改失败");
        });
      } else {
        // 新增大屏
        pageBackendSync.createScreenBackend(page.name, parentId!).then((newPage) => {
          message.success("新增成功");
          if (newPage) {
            // 同步页面数据到 engine.page
            pageBackendSync.syncPagesTo(engine.page);
            // 展开父项目
            const newExpandedKeys = [...expandedKeys, parentId!];
            handleExpandedKeys(newExpandedKeys);
            // 选中新大屏并加载详情
            setSelectedKeys([newPage.id]);
            selectPage(newPage.id);
          }
        }).catch((error) => {
          message.error(error.message || "新增失败");
        });
      }
    },
  });

  // 树节点新增大屏操作
  function handleOptAdd(page: JsonTypePage) {
    addPageDialog.open({
      parentId: page.id,
      parentName: page.name,
      mode: 'add',
    });
  }

  // 树节点修改操作
  function handleOptEdit(page: JsonTypePage) {
    addPageDialog.open({
      page,
      mode: 'edit',
    });
  }

  // 树节点删除操作
  function handleOptDelete(page: JsonTypePage) {
    if (!confirm(`确定要删除"${page.name}"吗？`)) {
      return;
    }

    // 如果当前选中页在被删除列表中，清空选择
    if (engine.config.getCurrentPage() === page.id) {
      selectPage(undefined);
    }

    // 删除大屏
    pageBackendSync.deleteScreenBackend(page.id).then((success) => {
      if (success) {
        // 同步删除到 engine.page，使树节点更新
        pageBackendSync.syncPagesTo(engine.page);
        message.success("删除成功");
      } else {
        message.error("删除失败");
      }
    });
  }

  // 设置展开keys
  function handleExpandedKeys(keys: any[]) {
    setExpandedKeys(keys);
    engine.config.setConfigSilently({ expandedPageIds: keys });
  }

  // 判断页面是否为项目级
  function isProjectLevel(page: JsonTypePage): boolean {
    return !page.parentId;
  }

  // 使用 useMemo 构建树数据
  const treeData = useMemo(() => {
    const idMap: Record<string, TreeDataNode> = {};

    function pagesToTreeDataLocal(pages: JsonTypePage[]): TreeDataNode[] {
      const treeData: TreeDataNode[] = [];

      pages.forEach((page) => {
        const currentNode = idMap[page.id];
        const isTopLevel = !page.parentId;

        const item: TreeDataNode = {
          key: String(currentNode?.key || page.id),
          title: (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {!isTopLevel && (
                  <FileOutlined style={{ marginRight: 8, color: "#1890ff" }} />
                )}
                <span>{page.name}</span>
              </div>
              {!isTopLevel && (
                <div style={{ fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                  <Dropdown
                    overlay={
                      <Menu
                        items={[
                          { key: 'rename', label: '重命名', onClick: () => handleOptEdit(page) },
                          { key: 'delete', label: '删除', onClick: () => handleOptDelete(page) }
                        ]}
                      />
                    }
                    trigger={['click']}
                  >
                    <Button type="text" size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>
              )}
            </div>
          ),
          children: currentNode?.children || [],
          icon: null,
          isLeaf: !isTopLevel,
        };

        idMap[page.id] = item;

        if (page?.parentId) {
          const parentNode = idMap[page.parentId] || { key: page.parentId, title: "", children: [] };
          parentNode.children = parentNode.children || [];
          parentNode.children.push(item);
          idMap[page.parentId] = parentNode;
          return;
        }

        // 项目级节点添加新增大屏按钮
        item.title = (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>{page.name}</span>
            </div>
            <Space size={4} onClick={(e) => e.stopPropagation()}>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleOptAdd(page)}
                title="新增大屏"
              />
            </Space>
          </div>
        );

        treeData.push(item);
      });

      return treeData;
    }

    return pagesToTreeDataLocal(pages);
  }, [pages, expandedKeys]);

  // 自定义树节点图标
  function customTreeIcon(props: any) {
    const { isLeaf } = props;
    if (isLeaf) {
      return null;
    }
    return null;
  }

  // 处理树节点选择
  function handleSelect(selectedKeys: React.Key[], info: any) {
    if (!selectedKeys.length) {
      return;
    }

    const selectedKey = selectedKeys[0] as string;
    const page = engine.page.get(selectedKey);

    // 如果是项目级页面，则不选中，只展开/折叠
    if (page && isProjectLevel(page)) {
      if (info.node.expanded) {
        handleExpandedKeys(expandedKeys.filter(key => key !== selectedKey));
      } else {
        handleExpandedKeys([...expandedKeys, selectedKey]);
      }
      return;
    }

    // 如果是页面级页面，正常选中
    setSelectedKeys([selectedKey]);
    selectPage(selectedKey);
  }

  useEffect(() => {
    setExpandedKeys(engine.config.getConfig().expandedPageIds || []);
  }, []);

  // 监听当前页面变化
  useEffect(() => {
    if (currentPage) {
      const page = engine.page.get(currentPage);
      if (page && isProjectLevel(page)) {
        setSelectedKeys([]);
      } else {
        setSelectedKeys([currentPage]);
      }
    } else {
      setSelectedKeys([]);
    }
  }, [currentPage, engine.page]);

  return (
    <div className={styles.pages}>
      <div className={styles.pages_head}>
        <b>页面管理</b>
        <Space>
          <Button
            type={"primary"}
            size={"small"}
            style={{ fontSize: 12 }}
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Space>
      </div>
      <div className={styles.pages_body}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>加载中...</div>
        ) : treeData.length > 0 ? (
          <Tree
            showIcon
            multiple={false}
            icon={customTreeIcon}
            treeData={treeData}
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            onExpand={handleExpandedKeys}
            onSelect={handleSelect}
            blockNode
          />
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无数据，请刷新</div>
        )}
      </div>
    </div>
  );
}