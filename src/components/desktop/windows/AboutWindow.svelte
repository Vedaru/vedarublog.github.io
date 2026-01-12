<script lang="ts">
	import { profileConfig } from '@/config';
	
	const profile = profileConfig;
</script>

<div class="about-window-content">
	<div class="profile-header">
		{#if profile.avatar}
			<img src={profile.avatar} alt={profile.name} class="profile-avatar" />
		{/if}
		<h1 class="profile-name">{profile.name}</h1>
		{#if profile.bio}
			<p class="profile-bio">{profile.bio}</p>
		{/if}
	</div>
	
	<div class="profile-details">
		{#if profile.bio}
			<div class="detail-item">
				<p class="detail-description">{profile.bio}</p>
			</div>
		{/if}
		
		{#if profile.links && profile.links.length > 0}
			<div class="social-links">
				<h3>社交链接</h3>
				<div class="links-grid">
					{#each profile.links as link}
						<a href={link.url} target="_blank" rel="noopener noreferrer" class="social-link">
							{link.name}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.about-window-content {
		padding: 20px;
	}
	
	.profile-header {
		text-align: center;
		margin-bottom: 30px;
	}
	
	.profile-avatar {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		object-fit: cover;
		margin-bottom: 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.profile-name {
		font-size: 28px;
		font-weight: 600;
		margin-bottom: 8px;
		color: rgba(0, 0, 0, 0.9);
	}
	
	:global(.dark) .profile-name {
		color: rgba(255, 255, 255, 0.9);
	}
	
	.profile-bio {
		font-size: 16px;
		color: rgba(0, 0, 0, 0.7);
		line-height: 1.6;
	}
	
	:global(.dark) .profile-bio {
		color: rgba(255, 255, 255, 0.7);
	}
	
	.profile-details {
		margin-top: 24px;
	}
	
	.detail-item {
		margin-bottom: 16px;
	}
	
	.detail-description {
		font-size: 15px;
		line-height: 1.6;
		color: rgba(0, 0, 0, 0.75);
		text-align: center;
	}
	
	:global(.dark) .detail-description {
		color: rgba(255, 255, 255, 0.75);
	}
	
	.detail-label {
		font-weight: 500;
		color: rgba(0, 0, 0, 0.6);
	}
	
	:global(.dark) .detail-label {
		color: rgba(255, 255, 255, 0.6);
	}
	
	.detail-value {
		color: rgba(0, 0, 0, 0.85);
	}
	
	:global(.dark) .detail-value {
		color: rgba(255, 255, 255, 0.85);
	}
	
	.social-links {
		margin-top: 24px;
	}
	
	.social-links h3 {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 12px;
		color: rgba(0, 0, 0, 0.9);
	}
	
	:global(.dark) .social-links h3 {
		color: rgba(255, 255, 255, 0.9);
	}
	
	.links-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
	}
	
	.social-link {
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid rgba(0, 0, 0, 0.05);
		border-radius: 6px;
		text-align: center;
		text-decoration: none;
		color: rgba(0, 0, 0, 0.85);
		font-size: 14px;
		transition: all 0.2s;
	}
	
	:global(.dark) .social-link {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.85);
	}
	
	.social-link:hover {
		background: rgba(0, 0, 0, 0.05);
		border-color: var(--primary);
		color: var(--primary);
		transform: translateY(-2px);
	}
	
	:global(.dark) .social-link:hover {
		background: rgba(255, 255, 255, 0.05);
	}
</style>
