export interface Post {
	id: string;
	data: {
		title: string;
		tags: string[];
		category?: string | null;
		published: string | Date;
		permalink?: string;
	};
}