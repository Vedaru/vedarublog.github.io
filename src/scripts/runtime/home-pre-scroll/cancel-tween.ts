import { cancelActiveTween } from "../cancellable-tween";

/** 取消进行中的预滚动 tween，保留当前 inline 视觉状态 */
export function cancelActivePreScrollTween() {
	return cancelActiveTween("pre-scroll-cancelled");
}
