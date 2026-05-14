import { shell } from "electron";
import { dirname } from "path/posix";

import { toast } from "sonner";

import { Editor } from "../editor/main";

import { execNodePty, NodePtyInstance } from "../tools/node-pty";
import { checkPackageManagerAvailable, packageManagerAvailable } from "../tools/process";

import { projectConfiguration } from "./configuration";

let isBusy = false;
let devAddress: string | null = null;
let instance: NodePtyInstance | null = null;

export async function startProjectDevProcess(editor: Editor) {
	if (isBusy || !projectConfiguration.path) {
		return;
	}

	if (devAddress) {
		return shell.openExternal(devAddress);
	}

	isBusy = true;

	editor.layout.selectTab("console");

	const log = await editor.layout.console.progress("正在启动游戏/应用...");

	await checkPackageManagerAvailable(editor.state.packageManager!);

	if (!packageManagerAvailable) {
		const message = `包管理器不可用，请安装 ${editor.state.packageManager}。`;

		log.setState({
			error: true,
			message: message,
		});

		toast.error(message);

		throw new Error(message);
	}

	let command = "";
	switch (editor.state.packageManager) {
		case "npm":
			command = "npm run dev";
			break;
		case "pnpm":
			command = "pnpm dev";
			break;
		case "bun":
			command = "bun run dev";
			break;
		default:
			command = "yarn dev";
			break;
	}

	const localhostRegex = /http:\/\/localhost:(\d+)/;
	const projectDir = dirname(projectConfiguration.path);

	// Create play process
	instance = await execNodePty(command, {
		cwd: projectDir,
	});

	instance.onGetDataObservable.add((data) => {
		if (!devAddress) {
			const match = data.match(localhostRegex);
			if (match) {
				devAddress = `http://localhost:${match[1]}`;
			}
		}

		const readyIndex = data.indexOf("Ready");
		if (readyIndex !== -1 && devAddress) {
			log.setState({
				done: true,
				message: (
					<div>
						游戏/应用已就绪，地址：{" "}
						<a className="underline underline-offset-4" onClick={() => shell.openExternal(devAddress!)}>
							{devAddress}
						</a>
					</div>
				),
			});

			isBusy = false;
			shell.openExternal(devAddress);
			instance!.onGetDataObservable.clear();
		}
	});
}

export async function stopProjectDevProcess() {
	devAddress = null;

	instance?.kill();
	instance = null;
}
