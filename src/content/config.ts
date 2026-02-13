import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const artworksCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    titleHe: z.string().optional(),
    titleEn: z.string().optional(),
    description: z.string().optional(),
    image: z.string(),
    category: z.string().optional(),
    year: z.string().optional(),
    date: z.string().optional(),
    featured: z.boolean().default(false),
    medium: z.string().optional(),
    size: z.string().optional(),
    price: z.string().optional(),
    sold: z.boolean().default(false),
    subjects: z.array(z.string()).optional().default([]),
  }),
});

export const collections = {
  artworks: artworksCollection,
};
