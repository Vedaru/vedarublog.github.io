import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().nullable().default(null),
    draft: z.boolean().default(false),
    image: z.string().optional(),
    pinned: z.boolean().default(false),
    priority: z.number().optional(),
    lang: z.string().optional(),
    author: z.string().optional(),
    sourceLink: z.string().optional().default(""),
    permalink: z.string().optional(),
    encrypted: z.boolean().optional().default(false),
    updated: z.date().optional(),
    password: z.string().optional(),
    alias: z.string().optional(),
    licenseName: z.string().optional(),
    licenseUrl: z.string().optional(),
    // Runtime-only: set by getSortedPosts()
    nextSlug: z.string().optional(),
    nextTitle: z.string().optional(),
    prevSlug: z.string().optional(),
    prevTitle: z.string().optional(),
  }),
});

const diaryCollection = defineCollection({
  schema: z.object({
    month: z.string(),
  }),
});

const specCollection = defineCollection({
  schema: z.object({}),
});

export const collections = {
  posts: postsCollection,
  diary: diaryCollection,
  spec: specCollection,
};
