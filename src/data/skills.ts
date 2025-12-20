// Skill data configuration file
// Used to manage data for the skill display page

export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	projects?: string[]; // Related project IDs
	certifications?: string[];
	color?: string; // Skill card theme color
}

export const skillsData: Skill[] = [
	// Frontend Skills
	{
		id: "javascript",
		name: "JavaScript",
		description:
			"Modern JavaScript development, including ES6+ syntax, asynchronous programming, and modular development.",
		icon: "logos:javascript",
		category: "frontend",
		level: "beginner",
		experience: { years: 0, months: 6 },
		projects: ["mizuki-blog", "portfolio-website", "data-visualization-tool"],
		color: "#F7DF1E",
	},
	{
		id: "astro",
		name: "Astro",
		description:
			"A modern static site generator supporting multi-framework integration and excellent performance.",
		icon: "logos:astro-icon",
		category: "frontend",
		level: "beginner",
		experience: { years: 1, months: 2 },
		projects: ["mizuki-blog"],
		color: "#FF5D01",
	},

	// Backend Skills
	{
		id: "python",
		name: "Python",
		description:
			"A general-purpose programming language suitable for web development, data analysis, machine learning, and more.",
		icon: "logos:python",
		category: "backend",
		level: "intermediate",
		experience: { years: 1, months: 10 },
		color: "#3776AB",
	},
	{
		id: "cpp",
		name: "C++",
		description:
			"A high-performance systems programming language widely used in game development, system software, and embedded development.",
		icon: "logos:c-plusplus",
		category: "backend",
		level: "intermediate",
		experience: { years: 1, months: 4 },
		projects: ["game-engine", "system-optimization"],
		color: "#00599C",
	},

	// Database Skills
	// {
	// 	id: "mysql",
	// 	name: "MySQL",
	// 	description:
	// 		"The world's most popular open-source relational database management system, widely used in web applications.",
	// 	icon: "logos:mysql-icon",
	// 	category: "database",
	// 	level: "advanced",
	// 	experience: { years: 2, months: 6 },
	// 	projects: ["e-commerce-platform", "blog-system"],
	// 	color: "#4479A1",
	// },
	// {
	// 	id: "postgresql",
	// 	name: "PostgreSQL",
	// 	description:
	// 		"A powerful open-source relational database management system.",
	// 	icon: "logos:postgresql",
	// 	category: "database",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 5 },
	// 	projects: ["e-commerce-platform"],
	// 	color: "#336791",
	// },
	// {
	// 	id: "redis",
	// 	name: "Redis",
	// 	description:
	// 		"A high-performance in-memory data structure store, used as a database, cache, and message broker.",
	// 	icon: "logos:redis",
	// 	category: "database",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 3 },
	// 	projects: ["e-commerce-platform", "real-time-chat"],
	// 	color: "#DC382D",
	// },
	// {
	// 	id: "mongodb",
	// 	name: "MongoDB",
	// 	description:
	// 		"A document-oriented NoSQL database with a flexible data model.",
	// 	icon: "logos:mongodb-icon",
	// 	category: "database",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 2 },
	// 	color: "#47A248",
	// },
	// {
	// 	id: "sqlite",
	// 	name: "SQLite",
	// 	description:
	// 		"A lightweight embedded relational database, suitable for mobile applications and small projects.",
	// 	icon: "simple-icons:sqlite",
	// 	category: "database",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 8 },
	// 	projects: ["mobile-app", "desktop-tool"],
	// 	color: "#003B57",
	// },
	// {
	// 	id: "firebase",
	// 	name: "Firebase",
	// 	description:
	// 		"Google's mobile and web application development platform providing real-time database and authentication services.",
	// 	icon: "simple-icons:firebase",
	// 	category: "database",
	// 	level: "intermediate",
	// 	experience: { years: 0, months: 10 },
	// 	projects: ["task-manager-app"],
	// 	color: "#FFCA28",
	// },

	// Tools
	{
		id: "git",
		name: "Git",
		description:
			"A distributed version control system, an essential tool for code management and team collaboration.",
		icon: "logos:git-icon",
		category: "tools",
		level: "intermediate",
		experience: { years: 1, months: 0 },
		color: "#F05032",
	},
	{
		id: "vscode",
		name: "VS Code",
		description:
			"A lightweight but powerful code editor with a rich plugin ecosystem.",
		icon: "logos:visual-studio-code",
		category: "tools",
		level: "advanced",
		experience: { years: 1, months: 6 },
		color: "#007ACC",
	},
	// {
	// 	id: "webstorm",
	// 	name: "WebStorm",
	// 	description:
	// 		"A professional JavaScript and web development IDE developed by JetBrains with intelligent code assistance.",
	// 	icon: "logos:webstorm",
	// 	category: "tools",
	// 	level: "advanced",
	// 	experience: { years: 2, months: 0 },
	// 	projects: ["react-project", "vue-project"],
	// 	color: "#00CDD7",
	// },
	// {
	// 	id: "pycharm",
	// 	name: "PyCharm",
	// 	description:
	// 		"A professional Python IDE by JetBrains providing intelligent code analysis and debugging features.",
	// 	icon: "logos:pycharm",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 4 },
	// 	projects: ["python-web-app", "data-analysis"],
	// 	color: "#21D789",
	// },
	// {
	// 	id: "rider",
	// 	name: "Rider",
	// 	description:
	// 		"A cross-platform .NET IDE by JetBrains supporting development in C#, VB.NET, F#, and other languages.",
	// 	icon: "logos:rider",
	// 	category: "tools",
	// 	level: "beginner",
	// 	experience: { years: 0, months: 8 },
	// 	projects: ["dotnet-api", "desktop-app"],
	// 	color: "#616161", // 更改为深灰色，避免纯黑色
	// },
	// {
	// 	id: "goland",
	// 	name: "GoLand",
	// 	description:
	// 		"A professional Go language IDE by JetBrains providing intelligent coding assistance and debugging tools.",
	// 	icon: "logos:goland",
	// 	category: "tools",
	// 	level: "beginner",
	// 	experience: { years: 0, months: 6 },
	// 	projects: ["go-microservice"],
	// 	color: "#3D7BF7",
	// },
	{
		id: "docker",
		name: "Docker",
		description:
			"A containerization platform that simplifies application deployment and environment management.",
		icon: "logos:docker-icon",
		category: "tools",
		level: "intermediate",
		experience: { years: 1, months: 0 },
		color: "#2496ED",
	},
	// {
	// 	id: "kubernetes",
	// 	name: "Kubernetes",
	// 	description:
	// 		"A container orchestration platform for automating deployment, scaling, and management of containerized applications.",
	// 	icon: "logos:kubernetes",
	// 	category: "tools",
	// 	level: "beginner",
	// 	experience: { years: 0, months: 4 },
	// 	projects: ["microservices-deployment"],
	// 	color: "#326CE5",
	// },
	// {
	// 	id: "nginx",
	// 	name: "Nginx",
	// 	description: "A high-performance web server and reverse proxy server.",
	// 	icon: "logos:nginx",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 2 },
	// 	projects: ["web-server-config", "load-balancer"],
	// 	color: "#009639",
	// },
	// {
	// 	id: "apache",
	// 	name: "Apache HTTP Server",
	// 	description:
	// 		"The world's most popular web server software, a stable and reliable HTTP server.",
	// 	icon: "logos:apache",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 6 },
	// 	projects: ["traditional-web-server", "php-hosting"],
	// 	color: "#D22128",
	// },
	// {
	// 	id: "openresty",
	// 	name: "OpenResty",
	// 	description:
	// 		"A high-performance web platform based on Nginx and LuaJIT, supporting dynamic web application development.",
	// 	icon: "simple-icons:nginx",
	// 	category: "tools",
	// 	level: "beginner",
	// 	experience: { years: 0, months: 8 },
	// 	projects: ["api-gateway", "dynamic-routing"],
	// 	color: "#00A693",
	// },
	// {
	// 	id: "tomcat",
	// 	name: "Apache Tomcat",
	// 	description:
	// 		"A Java Servlet container and web server, the standard deployment environment for Java web applications.",
	// 	icon: "logos:tomcat",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 4 },
	// 	projects: ["java-web-app", "servlet-container"],
	// 	color: "#F8DC75",
	// },
	// {
	// 	id: "aws",
	// 	name: "AWS",
	// 	description:
	// 		"Amazon's cloud platform providing comprehensive cloud computing solutions.",
	// 	icon: "logos:aws",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 0 },
	// 	projects: ["cloud-deployment", "serverless-app"],
	// 	color: "#FF9900",
	// },
	// {
	// 	id: "linux",
	// 	name: "Linux",
	// 	description:
	// 		"An open-source operating system, the preferred choice for server deployment and development environments.",
	// 	icon: "logos:linux-tux",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 2, months: 0 },
	// 	projects: ["server-management", "shell-scripting"],
	// 	color: "#FCC624",
	// },
	// {
	// 	id: "postman",
	// 	name: "Postman",
	// 	description:
	// 		"An API development and testing tool that simplifies API design, testing, and documentation.",
	// 	icon: "logos:postman-icon",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 8 },
	// 	projects: ["api-testing", "api-documentation"],
	// 	color: "#FF6C37",
	// },
	// {
	// 	id: "figma",
	// 	name: "Figma",
	// 	description:
	// 		"A collaborative interface design tool for UI/UX design and prototyping.",
	// 	icon: "logos:figma",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 6 },
	// 	color: "#F24E1E",
	// },
	// {
	// 	id: "photoshop",
	// 	name: "Photoshop",
	// 	description: "Professional image editing and design software.",
	// 	icon: "logos:adobe-photoshop",
	// 	category: "tools",
	// 	level: "intermediate",
	// 	experience: { years: 2, months: 6 },
	// 	projects: ["ui-design", "image-processing"],
	// 	color: "#31A8FF",
	// },

	// Other Skills
	// {
	// 	id: "graphql",
	// 	name: "GraphQL",
	// 	description:
	// 		"An API query language and runtime providing a more efficient, powerful, and flexible way to fetch data.",
	// 	icon: "logos:graphql",
	// 	category: "other",
	// 	level: "beginner",
	// 	experience: { years: 0, months: 6 },
	// 	projects: ["modern-api"],
	// 	color: "#E10098",
	// },
	{
		id: "elasticsearch",
		name: "Elasticsearch",
		description:
			"A distributed search and analytics engine used for full-text search and data analysis.",
		icon: "logos:elasticsearch",
		category: "other",
		level: "beginner",
		experience: { years: 0, months: 4 },
		projects: ["search-system"],
		color: "#005571",
	},
	// {
	// 	id: "jest",
	// 	name: "Jest",
	// 	description:
	// 		"A JavaScript testing framework focused on simplicity and ease of use.",
	// 	icon: "logos:jest",
	// 	category: "other",
	// 	level: "intermediate",
	// 	experience: { years: 1, months: 2 },
	// 	projects: ["unit-testing", "integration-testing"],
	// 	color: "#C21325",
	// },
	// {
	// 	id: "cypress",
	// 	name: "Cypress",
	// 	description: "A modern end-to-end testing framework for web applications.",
	// 	icon: "logos:cypress-icon",
	// 	category: "other",
	// 	level: "beginner",
	// 	experience: { years: 0, months: 8 },
	// 	projects: ["e2e-testing"],
	// 	color: "#17202C",
	// },
];

// Get skill statistics
export const getSkillStats = () => {
	const total = skillsData.length;
	const byLevel = {
		beginner: skillsData.filter((s) => s.level === "beginner").length,
		intermediate: skillsData.filter((s) => s.level === "intermediate").length,
		advanced: skillsData.filter((s) => s.level === "advanced").length,
		expert: skillsData.filter((s) => s.level === "expert").length,
	};
	const byCategory = {
		frontend: skillsData.filter((s) => s.category === "frontend").length,
		backend: skillsData.filter((s) => s.category === "backend").length,
		database: skillsData.filter((s) => s.category === "database").length,
		tools: skillsData.filter((s) => s.category === "tools").length,
		other: skillsData.filter((s) => s.category === "other").length,
	};

	return { total, byLevel, byCategory };
};

// Get skills by category
export const getSkillsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return skillsData;
	}
	return skillsData.filter((s) => s.category === category);
};

// Get advanced skills
export const getAdvancedSkills = () => {
	return skillsData.filter(
		(s) => s.level === "advanced" || s.level === "expert",
	);
};

// Calculate total years of experience
export const getTotalExperience = () => {
	const totalMonths = skillsData.reduce((total, skill) => {
		return total + skill.experience.years * 12 + skill.experience.months;
	}, 0);
	return {
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
	};
};
