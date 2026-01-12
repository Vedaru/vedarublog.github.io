import type { APIRoute } from 'astro';
import { getSortedPostsList } from '../../utils/content-utils';

export const GET: APIRoute = async () => {
	try {
		const posts = await getSortedPostsList();

		// 转换数据以匹配 ArchivePanel 期望的类型
		const transformedPosts = posts.map((post: any) => ({
			...post,
			data: {
				...post.data,
				category: post.data.category || undefined
			}
		}));

		return new Response(JSON.stringify(transformedPosts), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600' // 缓存1小时
			}
		});
	} catch (error) {
		console.error('Error fetching posts:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};