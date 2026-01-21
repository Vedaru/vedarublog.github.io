// Timeline data configuration file
// Used to manage data for the timeline page

export interface TimelineItem {
	id: string;
	title: string;
	description: string;
	type: "education" | "work" | "project" | "achievement";
	startDate: string;
	endDate?: string; // If empty, it means current
	location?: string;
	organization?: string;
	position?: string;
	skills?: string[];
	achievements?: string[];
	links?: {
		name: string;
		url: string;
		type: "website" | "certificate" | "project" | "other";
	}[];
	icon?: string; // Iconify icon name
	color?: string;
	featured?: boolean;
}

export const timelineData: TimelineItem[] = [
	{
		id: "current-study",
		title: "计算机学习",
		description:
			"课余时间学习计算机技术，专注于网页开发、软件工程和人工智能算法。",
		type: "education",
		startDate: "2025-09-01",
		skills: ["Python", "JavaScript", "TypeScript", "Astro", "Machine Learning"],
		achievements: [
			"学习了python和前端开发的基础知识",
			"完成了数据结构与算法的学习",
		],
		icon: "material-symbols:school",
		color: "#059669",
		featured: true,
	},
	// {
	// 	id: "mizuki-blog-project",
	// 	title: "Mizuki Personal Blog Project",
	// 	description:
	// 		"A personal blog website developed using the Astro framework as a practical project for learning frontend technologies.",
	// 	type: "project",
	// 	startDate: "2024-06-01",
	// 	endDate: "2024-08-01",
	// 	skills: ["Astro", "TypeScript", "Tailwind CSS", "Git"],
	// 	achievements: [
	// 		"Mastered modern frontend development tech stack",
	// 		"Learned responsive design and user experience optimization",
	// 		"Completed the full process from design to deployment",
	// 	],
	// 	links: [
	// 		{
	// 			name: "GitHub Repository",
	// 			url: "https://github.com/example/mizuki-blog",
	// 			type: "project",
	// 		},
	// 		{
	// 			name: "Live Demo",
	// 			url: "https://mizuki-demo.example.com",
	// 			type: "website",
	// 		},
	// 	],
	// 	icon: "material-symbols:code",
	// 	color: "#7C3AED",
	// 	featured: true,
	// },
	// {
	// 	id: "summer-internship-2024",
	// 	title: "Frontend Development Intern",
	// 	description:
	// 		"Summer internship at an internet company, participating in frontend development of web applications.",
	// 	type: "work",
	// 	startDate: "2024-07-01",
	// 	endDate: "2024-08-31",
	// 	location: "Beijing",
	// 	organization: "TechStart Internet Company",
	// 	position: "Frontend Development Intern",
	// 	skills: ["React", "JavaScript", "CSS3", "Git", "Figma"],
	// 	achievements: [
	// 		"Completed user interface component development",
	// 		"Learned team collaboration and code standards",
	// 		"Received outstanding internship performance certificate",
	// 	],
	// 	icon: "material-symbols:work",
	// 	color: "#DC2626",
	// 	featured: true,
	// },
	// {
	// 	id: "web-development-course",
	// 	title: "Completed Web Development Online Course",
	// 	description:
	// 		"Completed a full-stack web development online course, systematically learning frontend and backend development technologies.",
	// 	type: "achievement",
	// 	startDate: "2024-01-15",
	// 	endDate: "2024-05-30",
	// 	organization: "Mooc Website",
	// 	skills: ["HTML", "CSS", "JavaScript", "Node.js", "Express"],
	// 	achievements: [
	// 		"Received course completion certificate",
	// 		"Completed 5 practical projects",
	// 		"Mastered full-stack development fundamentals",
	// 	],
	// 	links: [
	// 		{
	// 			name: "Course Certificate",
	// 			url: "https://certificates.example.com/web-dev",
	// 			type: "certificate",
	// 		},
	// 	],
	// 	icon: "material-symbols:verified",
	// 	color: "#059669",
	// },
	// {
	// 	id: "student-management-system",
	// 	title: "Student Management System Course Project",
	// 	description:
	// 		"Final project for the database course, developed a complete student information management system.",
	// 	type: "project",
	// 	startDate: "2023-11-01",
	// 	endDate: "2023-12-15",
	// 	skills: ["Java", "MySQL", "Swing", "JDBC"],
	// 	achievements: [
	// 		"Received excellent course project grade",
	// 		"Implemented complete CRUD functionality",
	// 		"Learned database design and optimization",
	// 	],
	// 	icon: "material-symbols:database",
	// 	color: "#EA580C",
	// },
	// {
	// 	id: "programming-contest",
	// 	title: "University Programming Contest",
	// 	description:
	// 		"Participated in a programming contest held by the university, improving algorithm and programming skills.",
	// 	type: "achievement",
	// 	startDate: "2023-10-20",
	// 	location: "Beijing Institute of Technology",
	// 	organization: "School of Computer Science",
	// 	skills: ["C++", "Algorithms", "Data Structures"],
	// 	achievements: [
	// 		"Won third prize in university contest",
	// 		"Improved algorithmic thinking ability",
	// 		"Strengthened programming fundamentals",
	// 	],
	// 	icon: "material-symbols:emoji-events",
	// 	color: "#7C3AED",
	// },
	// {
	// 	id: "part-time-tutor",
	// 	title: "Part-time Programming Tutor",
	// 	description:
	// 		"Provided programming tutoring for high school students, helping them learn Python basics.",
	// 	type: "work",
	// 	startDate: "2023-09-01",
	// 	endDate: "2024-01-31",
	// 	position: "Programming Tutor",
	// 	skills: ["Python", "Teaching", "Communication"],
	// 	achievements: [
	// 		"Helped 3 students master Python basics",
	// 		"Improved expression and communication skills",
	// 		"Gained teaching experience",
	// 	],
	// 	icon: "material-symbols:school",
	// 	color: "#059669",
	// },
	{
		id: "college",
		title: "大学学习",
		description: "成为大人了呢。培养了一堆爱好，比如看番，刷题，敲代码。",
		type: "education",
		startDate: "2025-09-01",
		achievements: ["小镇做题家，没什么成就可写"],
		icon: "material-symbols:school",
		color: "#2563EB",
	},
	{
		id: "high-school-graduation",
		title: "高中学习",
		description: "高中计算机课上学习了python的基础知识，激发了对编程的兴趣。",
		type: "education",
		startDate: "2022-09-01",
		endDate: "2025-06-30",
		achievements: ["小镇做题家，没什么成就可写"],
		icon: "material-symbols:school",
		color: "#2563EB",
	},
	{
		id: "yolo-project",
		title: "YOLO目标检测项目",
		description: "使用YOLOv5模型进行无人机目标检测的项目。",
		type: "project",
		startDate: "2025-12-13",
		skills: ["Pytorch", "YOLOv5", "Computer Vision"],
		achievements: [
			"深入学习了Pytorch和目标检测算法，并掌握了小参数体量模型在边缘设备上的部署方法。",
		],
		icon: "material-symbols:code",
		color: "#7C3AED",
	},
];

// Get timeline statistics
export const getTimelineStats = () => {
	const total = timelineData.length;
	const byType = {
		education: timelineData.filter((item) => item.type === "education").length,
		work: timelineData.filter((item) => item.type === "work").length,
		project: timelineData.filter((item) => item.type === "project").length,
		achievement: timelineData.filter((item) => item.type === "achievement")
			.length,
	};

	return { total, byType };
};

// Get timeline items by type
export const getTimelineByType = (type?: string) => {
	if (!type || type === "all") {
		return timelineData.sort(
			(a, b) =>
				new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
		);
	}
	return timelineData
		.filter((item) => item.type === type)
		.sort(
			(a, b) =>
				new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
		);
};

// Get featured timeline items
export const getFeaturedTimeline = () => {
	return timelineData
		.filter((item) => item.featured)
		.sort(
			(a, b) =>
				new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
		);
};

// Get current ongoing items
export const getCurrentItems = () => {
	return timelineData.filter((item) => !item.endDate);
};

// Calculate total work experience
export const getTotalWorkExperience = () => {
	const workItems = timelineData.filter((item) => item.type === "work");
	let totalMonths = 0;

	workItems.forEach((item) => {
		const startDate = new Date(item.startDate);
		const endDate = item.endDate ? new Date(item.endDate) : new Date();
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
		totalMonths += diffMonths;
	});

	return {
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
	};
};
