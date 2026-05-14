import { readJSON } from "fs-extra";

import { toast } from "sonner";

import { Animation, IAnimatable } from "babylonjs";

import { openSingleFileDialog } from "../../../../tools/dialog";

import { EditorAnimation } from "../../animation";

export async function importAnimationsFrom(animationEditor: EditorAnimation, animatable: IAnimatable | null) {
	const filePath = openSingleFileDialog({
		title: "导入动画",
		filters: [{ name: "动画文件", extensions: ["animations"] }],
	});

	if (!filePath) {
		return;
	}

	const data = await readJSON(filePath);
	data.forEach((animation) => {
		animatable?.animations?.push(Animation.Parse(animation));
	});

	animationEditor.forceUpdate();
	animationEditor.timelines?.setCurrentTime(0);

	toast("动画导入成功！");
}
