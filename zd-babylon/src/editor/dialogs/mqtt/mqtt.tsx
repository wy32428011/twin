import { Component, ReactNode } from "react";

import { Button } from "../../../ui/shadcn/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../ui/shadcn/ui/dialog";
import { Input } from "../../../ui/shadcn/ui/input";
import { Switch } from "../../../ui/shadcn/ui/switch";

import { IEditorProjectMqttConfiguration } from "../../../tools/mqtt/types";

import { Editor } from "../../main";

export interface IEditorMqttSettingsDialogProps {
	editor: Editor;
	open: boolean;
	onClose: () => void;
}

export class EditorMqttSettingsDialog extends Component<IEditorMqttSettingsDialogProps> {
	public render(): ReactNode {
		const mqtt = this.props.editor.state.mqtt;

		return (
			<Dialog open={this.props.open} onOpenChange={(open) => !open && this.props.onClose()}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>MQTT 数字孪生设置</DialogTitle>
						<DialogDescription>配置 broker 连接和项目级订阅。密码只保存在本次运行内存中，不会写入项目文件。</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4">
						{this._renderSwitch("启用 MQTT", mqtt.enabled, (enabled) => this._update({ enabled }))}
						{this._renderSwitch("编辑态实时预览", mqtt.enableEditorPreview ?? false, (enableEditorPreview) => this._update({ enableEditorPreview }))}
						{this._renderInput("Broker URL", mqtt.url, (url) => this._update({ url }), "mqtt://localhost:1883")}
						{this._renderInput("Client ID", mqtt.clientId ?? "", (clientId) => this._update({ clientId: clientId || undefined }))}
						{this._renderInput("用户名", mqtt.username ?? "", (username) => this._update({ username: username || undefined }))}
						{this._renderInput("运行时密码", mqtt.password ?? "", (password) => this._update({ password: password || undefined }), undefined, "password")}
						{this._renderInput("重连间隔 ms", String(mqtt.reconnectPeriod ?? 1000), (value) => this._update({ reconnectPeriod: Number(value) || 1000 }), undefined, "number")}
						{this._renderInput("连接超时 ms", String(mqtt.connectTimeout ?? 30000), (value) => this._update({ connectTimeout: Number(value) || 30000 }), undefined, "number")}
						<div className="flex flex-col gap-2">
							<div className="text-sm">订阅 Topic（每行一个）</div>
							<textarea
								className="min-h-28 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
								value={mqtt.topics.map((topic) => topic.topic).join("\n")}
								onChange={(ev) =>
									this._update({
										topics: ev.currentTarget.value
											.split("\n")
											.map((topic) => topic.trim())
											.filter(Boolean)
											.map((topic) => ({ topic })),
									})
								}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="secondary" onClick={() => this.props.editor.syncMqttConnection()}>应用连接</Button>
						<Button onClick={() => this.props.onClose()}>关闭</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	private _renderSwitch(label: string, checked: boolean, onChange: (checked: boolean) => void): ReactNode {
		return (
			<div className="flex items-center justify-between gap-4">
				<div className="text-sm">{label}</div>
				<Switch checked={checked} onCheckedChange={onChange} />
			</div>
		);
	}

	private _renderInput(label: string, value: string, onChange: (value: string) => void, placeholder?: string, type?: string): ReactNode {
		return (
			<div className="grid grid-cols-[140px_1fr] items-center gap-3">
				<div className="text-sm">{label}</div>
				<Input type={type ?? "text"} value={value} placeholder={placeholder} onChange={(ev) => onChange(ev.currentTarget.value)} />
			</div>
		);
	}

	private _update(configuration: Partial<IEditorProjectMqttConfiguration>): void {
		this.props.editor.setState({
			mqtt: {
				...this.props.editor.state.mqtt,
				...configuration,
			},
		});
	}
}
