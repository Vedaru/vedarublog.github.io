<script lang="ts">
	import { onMount } from 'svelte';
	
	interface Project {
		id: string;
		data: {
			title: string;
			description: string;
			technologies: string[];
			github?: string;
			demo?: string;
			image?: string;
		};
	}
	
	let projects: Project[] = [];
	let loading = true;
	let error: string | null = null;
	
	onMount(async () => {
		try {
			// 这里可以从API获取项目数据，或者使用静态数据
			// 暂时使用示例数据
			projects = [
				{
					id: '1',
					data: {
						title: '示例项目1',
						description: '这是一个示例项目的描述',
						technologies: ['React', 'TypeScript', 'Node.js'],
						github: 'https://github.com/example/project1',
						demo: 'https://example.com/demo1'
					}
				},
				{
					id: '2',
					data: {
						title: '示例项目2',
						description: '另一个示例项目的描述',
						technologies: ['Vue', 'JavaScript', 'Express'],
						github: 'https://github.com/example/project2'
					}
				}
			];
		} catch (err) {
			error = err instanceof Error ? err.message : '加载失败';
			console.error('Failed to load projects:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="projects-window-content">
	{#if loading}
		<div class="loading">加载中...</div>
	{:else if error}
		<div class="error">加载失败: {error}</div>
	{:else}
		<div class="projects-grid">
			{#each projects as project}
				<div class="project-card">
					{#if project.data.image}
						<img src={project.data.image} alt={project.data.title} class="project-image" />
					{/if}
					<div class="project-content">
						<h3 class="project-title">{project.data.title}</h3>
						<p class="project-description">{project.data.description}</p>
						<div class="project-tech">
							{#each project.data.technologies as tech}
								<span class="tech-tag">{tech}</span>
							{/each}
						</div>
						<div class="project-links">
							{#if project.data.github}
								<a href={project.data.github} target="_blank" rel="noopener noreferrer" class="project-link">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
									</svg>
									GitHub
								</a>
							{/if}
							{#if project.data.demo}
								<a href={project.data.demo} target="_blank" rel="noopener noreferrer" class="project-link demo-link">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"/>
									</svg>
									Demo
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.projects-window-content {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		padding: 16px;
		background: var(--card-bg);
	}
	
	.loading, .error {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 400px;
		color: var(--text-color);
	}
	
	.error {
		color: var(--error-color, #ef4444);
	}
	
	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 20px;
	}
	
	.project-card {
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 12px;
		overflow: hidden;
		background: var(--bg-color, #ffffff);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	
	.project-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}
	
	.project-image {
		width: 100%;
		height: 180px;
		object-fit: cover;
	}
	
	.project-content {
		padding: 20px;
	}
	
	.project-title {
		margin: 0 0 12px 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text-color);
	}
	
	.project-description {
		margin: 0 0 16px 0;
		color: var(--text-secondary, #6b7280);
		line-height: 1.5;
	}
	
	.project-tech {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
	}
	
	.tech-tag {
		padding: 4px 10px;
		background: var(--primary-bg, #f3f4f6);
		color: var(--primary-color, #3b82f6);
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
	}
	
	.project-links {
		display: flex;
		gap: 12px;
	}
	
	.project-link {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: var(--primary-color, #3b82f6);
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		transition: background-color 0.2s ease;
	}
	
	.project-link:hover {
		background: var(--primary-hover, #2563eb);
	}
	
	.demo-link {
		background: var(--secondary-color, #10b981);
	}
	
	.demo-link:hover {
		background: var(--secondary-hover, #059669);
	}
	
	:global(.dark) .project-card {
		background: var(--card-bg);
		border-color: var(--border-color);
	}
	
	:global(.dark) .project-title {
		color: var(--text-color);
	}
	
	:global(.dark) .project-description {
		color: var(--text-secondary);
	}
</style>