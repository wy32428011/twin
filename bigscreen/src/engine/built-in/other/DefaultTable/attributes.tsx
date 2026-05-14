/*
 * @Author: chengxianglong 18014926353@163@.com
 * @Date: 2026-03-30 11:03:27
 * @LastEditors: chengxianglong 18014926353@163@.com
 * @LastEditTime: 2026-03-31 08:23:51
 * @FilePath: \react-big-screen-master\src\engine\built-in\other\DefaultTable\attributes.tsx
 * @Description: 可滚动的表格
 */
// table/TableAttributes.tsx
import { createAttributesByConfig } from "@/engine";
import { useState } from 'react';
import { TableOptions, TableColumn, DEFAULT_OPTIONS } from "./type";
import { Modal, Button, Input, Space, Switch, Select } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

// 注册表格列配置组件
import ConfigRender from "@/components/ConfigRender";

ConfigRender.register('tableColumnsConfig', (props) => {
  const { value = [], onChange } = props;
  const [editingColumn, setEditingColumn] = useState<TableColumn | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleAdd = () => {
    setEditingColumn({
      id: Date.now().toString(),
      label: `列${value.length + 1}`,
      key: `type${value.length + 1}`,
      show: true,
    });
    setModalVisible(true);
  };
  
  const handleEdit = (column: TableColumn) => {
    setEditingColumn({ ...column });
    setModalVisible(true);
  };
  
  const handleDelete = (id: string) => {
    onChange(value.filter((col: any) => col.id !== id));
  };
  
  const handleSave = () => {
    if (!editingColumn) return;
    
    const newColumns = [...value];
    const index = newColumns.findIndex(col => col.id === editingColumn.id);
    
    if (index >= 0) {
      newColumns[index] = editingColumn;
    } else {
      newColumns.push(editingColumn);
    }
    
    onChange(newColumns);
    setModalVisible(false);
    setEditingColumn(null);
  };
  
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...value];
    if (direction === 'up' && index > 0) {
      [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
    } else if (direction === 'down' && index < newColumns.length - 1) {
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    }
    onChange(newColumns);
  };
  
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="small">
          新增列
        </Button>
      </div>
      
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {value.map((column: any, index: any) => (
          <div 
            key={column.id}
            style={{
              padding: '8px 6px',
              marginBottom: 8,
              background: '#fafafa',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <strong>{column.label}</strong>
                <span style={{ color: '#666', marginLeft: 12 }}>key: {column.key}</span>
              </div>
            </div>
            <Space>
                <Button size="small" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                  上移
                </Button>
                <Button size="small" onClick={() => handleMove(index, 'down')} disabled={index === value.length - 1}>
                  下移
                </Button>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(column)}
                />
                <Button 
                  type="text" 
                  danger
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(column.id)}
                />
              </Space>
          </div>
        ))}
      </div>
      
      <Modal
        title={editingColumn && value.some((c:any) => c.id === editingColumn.id) ? "编辑列" : "新增列"}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false);
          setEditingColumn(null);
        }}
        width={400}
      >
        {editingColumn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>列名称：</label>
              <Input
                value={editingColumn.label}
                onChange={(e) => setEditingColumn({ ...editingColumn, label: e.target.value })}
                placeholder="请输入列名称"
              />
            </div>
            <div>
              <label>key值：</label>
              <Input
                value={editingColumn.key}
                onChange={(e) => setEditingColumn({ ...editingColumn, key: e.target.value })}
                placeholder="请输入key值"
              />
            </div>
            <div>
              <label>对齐方式：</label>
              <Select
                style={{ width: '100%' }}
                value={editingColumn.textAlign || 'left'}
                onChange={(value) => setEditingColumn({ ...editingColumn, textAlign: value })}
                options={[
                  { label: '左对齐', value: 'left' },
                  { label: '居中', value: 'center' },
                  { label: '右对齐', value: 'right' },
                ]}
              />
            </div>
            <div>
              <label>列宽：</label>
              <Input
                type="number"
                value={editingColumn.width}
                onChange={(e) => setEditingColumn({ 
                  ...editingColumn, 
                  width: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="自动宽度"
              />
            </div>
            <div>
              <label>
                <Switch
                  checked={editingColumn.show !== false}
                  onChange={(checked) => setEditingColumn({ ...editingColumn, show: checked })}
                />
                <span style={{ marginLeft: 8 }}>显示</span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
});

// 数据编辑器组件
ConfigRender.register('tableDataEditor', (props) => {
  const { value, onChange } = props;
  const [dataText, setDataText] = useState(() => {
    try {
      return JSON.stringify(value || [], null, 2);
    } catch {
      return '[]';
    }
  });
  
  const handleChange = (text: string) => {
    setDataText(text);
    try {
      const data = JSON.parse(text);
      onChange(data);
    } catch (error) {
      // 解析失败时不更新数据
    }
  };
  
  return (
    <div>
      <TextArea
        value={dataText}
        onChange={(e) => handleChange(e.target.value)}
        rows={10}
        placeholder="请输入JSON格式的数据，例如：[{&quot;type1&quot;: &quot;数据1&quot;, &quot;type2&quot;: &quot;数据2&quot;}]"
      />
      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        支持JSON数组格式，每个对象对应一行数据
      </div>
    </div>
  );
});

export default createAttributesByConfig<TableOptions>([
  <b key="basic-title" style={{ marginTop: 12 }}>基本设置</b>,
  { key: 'name', label: '表格名称', component: 'input' },
  { key: 'hidden', label: '隐藏', component: 'checkbox' },
  { key: 'enableRanking', label: '开启排名', component: 'checkbox' },
  // { key: 'showBorder', label: '边框', component: 'checkbox' },
  { key: 'enableScroll', label: '开启滚动', component: 'checkbox' },
  { 
    key: 'scrollInterval', 
    label: '滚动间隔', 
    component: 'inputNumber', 
    options: { 
      min: 0.1, 
      step: 0.1,
      placeholder: '秒'
    } 
  },
  { 
    key: 'scrollSpeed', 
    label: '滚动速度', 
    component: 'inputNumber', 
    options: { 
      min: 1,
      placeholder: '像素/秒'
    } 
  },
  
  <b key="header-title" style={{ marginTop: 24 }}>表头设置</b>,
  { key: 'showHeader', label: '显示', component: 'checkbox' },
  { key: 'headerFontSize', label: '字号大小', component: 'inputNumber', options: { min: 8 } },
  { key: 'headerBackground', label: '背景颜色', component: 'colorPicker' },
  { key: 'headerColor', label: '字体颜色', component: 'colorPicker' },
  { 
    key: 'headerTextAlign', 
    label: '对齐方式', 
    component: 'textAlignSelect' 
  },
  
  <b key="table-title" style={{ marginTop: 24 }}>表格设置</b>,
  { key: 'showRows', label: '显示行数', component: 'inputNumber', options: { min: 1 } },
  { key: 'fontSize', label: '字体大小', component: 'inputNumber', options: { min: 8 } },
  { key: 'textAlign', label: '对齐方式', component: 'textAlignSelect' },
  { key: 'textColor', label: '文字颜色', component: 'colorPicker' },
  { key: 'oddRowColor', label: '奇行颜色', component: 'colorPicker' },
  { key: 'evenRowColor', label: '偶行颜色', component: 'colorPicker' },
  { key: 'rowHeight', label: '行高', component: 'inputNumber', options: { min: 20 } },
  
  <b key="columns-title" style={{ marginTop: 24 }}>表格列设置</b>,
  { 
    key: 'columns', 
    label: '列配置', 
    component: 'tableColumnsConfig' 
  }
], DEFAULT_OPTIONS);