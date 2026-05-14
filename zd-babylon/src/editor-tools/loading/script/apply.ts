
import { Observer, Scene, PointerInfo, KeyboardInfo } from "babylonjs";
import { IScript } from "../../script";


export interface IRegisteredScript {
	/**
	 * Defines the key of the script. Refer to scriptMap.
	 */
	key: string;
	/**
	 * Defines the instance of the script that was created while loading the scene.
	 */
	instance: IScript;
	/**
	 * Defines the dictionary of all registered observers for this script.
	 */
	observers: IRegisteredScriptObservers;
}

export interface IRegisteredScriptObservers {
	onStartObserver?: Observer<Scene> | null;
	onUpdateObserver?: Observer<Scene> | null;
	pointerObserver?: Observer<PointerInfo> | null;
	keyboardObserver?: Observer<KeyboardInfo> | null;
}