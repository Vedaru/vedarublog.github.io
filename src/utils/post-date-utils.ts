function assertValidDate(date: Date): void {
	if (Number.isNaN(date.getTime())) {
		throw new RangeError("Invalid published date");
	}
}

function compareIds(idA: string, idB: string): number {
	if (idA < idB) return -1;
	if (idA > idB) return 1;
	return 0;
}

/**
 * 按发布时间倒序比较；时间相同时用 id 决出稳定顺序（归档需要确定性排列，
 * 不能继承 getSortedPostsList 的置顶优先顺序）。
 */
export function comparePublishedDatesDescending(
	dateA: Date,
	dateB: Date,
	idA: string,
	idB: string,
): number {
	assertValidDate(dateA);
	assertValidDate(dateB);
	const timeDifference = dateB.getTime() - dateA.getTime();
	return timeDifference === 0 ? compareIds(idA, idB) : timeDifference;
}
