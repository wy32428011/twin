import { createBindModalHook } from "@/hooks";
import { Form, Modal } from "antd";
import { IInput } from "@/components/Attributes/base/IInput";
import { JsonTypePage } from "@/engine";
import { useEffect } from "react";

interface Params {
  parentId?: string;
  parentName?: string;
  mode?: 'add' | 'edit'; // 新增模式：add-新增，edit-编辑
  page?: JsonTypePage; // 编辑时需要传的页面信息
}

const usePageDialog = createBindModalHook<Params>((props) => {
  const { params } = props;
  const [form] = Form.useForm();
  const mode = params?.mode || 'add';
  const isEdit = mode === 'edit';

  // 根据模式设置标题
  const getTitle = () => {
    if (isEdit) {
      return "编辑";
    }
    return params?.parentName ? "新增页面" : "新增项目";
  };

  // 创建新页面（不设置id，由后端生成）
  function createNewPage(name: string): JsonTypePage {
    return {
      name,
      parentId: params?.parentId,
    };
  }

  // 更新现有页面
  function updatePage(name: string): JsonTypePage {
    if (!params?.page) {
      throw new Error("编辑模式下需要传入页面信息");
    }
    
    return {
      ...params.page,
      name,
    };
  }

  function handleOk() {
    form.validateFields().then((values) => {
      const page = isEdit ? updatePage(values.name) : createNewPage(values.name);
      
      props?.onOk?.({
        page,
        parentId: params?.parentId,
        mode,
        originalPage: params?.page, // 返回原始页面信息，用于编辑时比较
      });
    });
  }

  // 当弹窗打开时，如果是编辑模式，设置表单初始值
  useEffect(() => {
    if (props.visible && isEdit && params?.page) {
      form.setFieldsValue({
        name: params.page.name
      });
    } else {
      form.resetFields();
    }
  }, [props.visible, isEdit, params?.page, form]);

  return (
    <Modal
      centered
      open={props?.visible}
      title={getTitle()}
      afterClose={props?.afterClose}
      onCancel={props?.onCancel}
      onOk={handleOk}
      width={500}
      okText={isEdit ? "保存" : "确认"}
      cancelText="取消"
      bodyStyle={{
        padding: "12px 24px 12px 12px",
      }}
    >
      <Form form={form} labelCol={{ span: 4 }}>
        {!isEdit && params?.parentName && (
          <Form.Item label={"所属项目"}>{params?.parentName}</Form.Item>
        )}
        
        <Form.Item 
          label={"名称"} 
          name={"name"} 
          rules={[
            { required: true, message: "请输入名称" },
            { max: 50, message: "名称不能超过50个字符" },
            { 
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("名称不能为空或只包含空格"));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <IInput 
            placeholder={isEdit ? "请输入新的页面名称" : "请输入页面名称"}
            maxLength={50}
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  );
});

export default usePageDialog;
