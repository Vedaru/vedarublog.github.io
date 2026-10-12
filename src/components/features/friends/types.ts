import type { FriendItem } from "../../../data/friends";

export type { FriendItem };

export interface FriendsPanelProps {
	friendsList: FriendItem[];
	/** 界面语言（.astro 父组件传入 Astro.currentLocale）。 */
	locale?: string;
}
