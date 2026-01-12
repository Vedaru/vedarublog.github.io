/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
	darkMode: "class", // allows toggling dark mode manually
	theme: {
		extend: {
			fontFamily: {
				sans: [
					"Microsoft YaHei",
					"Segoe UI",
					"Helvetica Neue",
					"Arial",
					"sans-serif",
					...defaultTheme.fontFamily.sans,
				],
				system: ["Segoe UI", "Roboto", "system-ui", "sans-serif"],
			},
			screens: {
				md: "1280px", // 原默认值: 768px, 增大后navbar会更早坍缩
				lg: "1280px", // 原默认值: 1024px, 保持与md一致以确保统一的响应式行为
			},
			boxShadow: {
				'window': '0 2px 8px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)',
				'window-hover': '0 4px 12px rgba(0, 0, 0, 0.2), 0 6px 24px rgba(0, 0, 0, 0.15)',
				'window-active': '0 8px 16px rgba(0, 0, 0, 0.25), 0 12px 32px rgba(0, 0, 0, 0.2)',
				'taskbar': '0 -2px 8px rgba(0, 0, 0, 0.1)',
				'icon': '0 1px 3px rgba(0, 0, 0, 0.12)',
			},
			borderRadius: {
				'window': '8px',
				'button': '4px',
				'icon': '6px',
			},
			colors: {
				'desktop-bg': '#008080',
				'window-bg': '#c0c0c0',
				'window-title': '#000080',
				'window-title-text': '#ffffff',
				'taskbar-bg': '#c0c0c0',
				'button-face': '#c0c0c0',
				'button-highlight': '#ffffff',
				'button-shadow': '#808080',
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
