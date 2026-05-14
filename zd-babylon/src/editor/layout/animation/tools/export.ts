import { writeJSON } from "fs-extra";

import { toast } from "sonner";

import { IAnimatable } from "babylonjs";

import { saveSingleFileDialog } from "../../../../tools/dialog";

import { showAlert } from "../../../../ui/dialog";

export async function exportAnimationsAs(animatable: IAnimatable | null) {
	const data = animatable?.animations?.map((animation) => {
		return animation.serialize();
	});

	if (!data?.length) {
		return showAlert("没有可导出的动画。", "该对象没有可导出的动画，请至少添加一条轨道");
	}

	const destination = saveSingleFileDialog({
		title: "导出动画",
		filters: [{ name: "动画文件", extensions: ["animations"] }],
	});

	if (!destination) {
		return;
	}

	await writeJSON(destination, data, {
		spaces: 4,
		encoding: "utf8",
	});

	toast("动画导出成功。");
}
