<script lang="ts">
	import { profileConfig } from '@/config';
	
	const contactInfo = {
		email: 'your-email@example.com', // 可以在这里设置默认邮箱，或者从其他配置中获取
		links: profileConfig.links || []
	};
</script>

<div class="contact-window-content">
	<div class="contact-header">
		<h2 class="contact-title">联系方式</h2>
		<p class="contact-subtitle">欢迎通过以下方式与我取得联系</p>
	</div>
	
	<div class="contact-content">
		{#if contactInfo.email}
			<div class="contact-item">
				<div class="contact-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
						<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
					</svg>
				</div>
				<div class="contact-details">
					<h3 class="contact-label">邮箱</h3>
					<a href="mailto:{contactInfo.email}" class="contact-value">{contactInfo.email}</a>
				</div>
			</div>
		{/if}
		
		{#if contactInfo.links && contactInfo.links.length > 0}
			<div class="contact-section">
				<h3 class="section-title">社交媒体</h3>
				<div class="social-links">
					{#each contactInfo.links as link}
						<a href={link.url} target="_blank" rel="noopener noreferrer" class="social-link">
							<span class="social-name">{link.name}</span>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"/>
							</svg>
						</a>
					{/each}
				</div>
			</div>
		{/if}
		
		<div class="contact-section">
			<h3 class="section-title">其他联系方式</h3>
			<p class="contact-note">
				如果您有任何问题、建议或合作意向，欢迎随时联系我。
				我会尽快回复您的消息。
			</p>
		</div>
	</div>
</div>

<style>
	.contact-window-content {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		padding: 24px;
		background: var(--card-bg);
	}
	
	.contact-header {
		text-align: center;
		margin-bottom: 32px;
	}
	
	.contact-title {
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 700;
		color: var(--text-color);
	}
	
	.contact-subtitle {
		margin: 0;
		font-size: 16px;
		color: var(--text-secondary, #6b7280);
	}
	
	.contact-content {
		max-width: 600px;
		margin: 0 auto;
	}
	
	.contact-item {
		display: flex;
		align-items: center;
		padding: 20px;
		margin-bottom: 16px;
		background: var(--bg-color, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 12px;
		transition: box-shadow 0.2s ease;
	}
	
	.contact-item:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.contact-icon {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--primary-bg, #f3f4f6);
		color: var(--primary-color, #3b82f6);
		border-radius: 12px;
		margin-right: 16px;
	}
	
	.contact-details {
		flex: 1;
	}
	
	.contact-label {
		margin: 0 0 4px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.contact-value {
		margin: 0;
		font-size: 18px;
		font-weight: 500;
		color: var(--primary-color, #3b82f6);
		text-decoration: none;
		transition: color 0.2s ease;
	}
	
	.contact-value:hover {
		color: var(--primary-hover, #2563eb);
	}
	
	.contact-section {
		margin-bottom: 24px;
	}
	
	.section-title {
		margin: 0 0 16px 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text-color);
	}
	
	.social-links {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	
	.social-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background: var(--bg-color, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		text-decoration: none;
		color: var(--text-color);
		transition: all 0.2s ease;
	}
	
	.social-link:hover {
		border-color: var(--primary-color, #3b82f6);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}
	
	.social-name {
		font-weight: 500;
	}
	
	.contact-note {
		margin: 0;
		padding: 20px;
		background: var(--bg-color, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		color: var(--text-secondary, #6b7280);
		line-height: 1.6;
	}
	
	:global(.dark) .contact-window-content {
		background: var(--card-bg);
	}
	
	:global(.dark) .contact-item,
	:global(.dark) .social-link,
	:global(.dark) .contact-note {
		background: var(--card-bg);
		border-color: var(--border-color);
	}
	
	:global(.dark) .contact-title,
	:global(.dark) .section-title {
		color: var(--text-color);
	}
	
	:global(.dark) .contact-subtitle {
		color: var(--text-secondary);
	}
	
	:global(.dark) .contact-label {
		color: var(--text-secondary);
	}
	
	:global(.dark) .contact-value {
		color: var(--primary-color);
	}
	
	:global(.dark) .contact-value:hover {
		color: var(--primary-hover);
	}
	
	:global(.dark) .social-link {
		color: var(--text-color);
	}
	
	:global(.dark) .contact-note {
		color: var(--text-secondary);
	}
</style>