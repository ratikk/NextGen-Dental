import { createReader } from '@keystatic/core/reader';
import config from '../../keystatic.config';

export const reader = createReader(process.cwd(), config);

export async function getHomepageContent() {
  return await reader.singletons.homepage.read();
}

export async function getSiteSettings() {
  return await reader.singletons.siteSettings.read();
}

export async function getAllServices() {
  const services = await reader.collections.services.all();
  return services;
}

export async function getService(slug: string) {
  return await reader.collections.services.read(slug);
}

export async function getAllBlogPosts() {
  const posts = await reader.collections.blogPosts.all();
  return posts.sort((a, b) => {
    const dateA = new Date(a.entry.date || '');
    const dateB = new Date(b.entry.date || '');
    return dateB.getTime() - dateA.getTime();
  });
}

export async function getBlogPost(slug: string) {
  return await reader.collections.blogPosts.read(slug);
}

export async function getAllTeamMembers() {
  return await reader.collections.team.all();
}

export async function getTeamMember(slug: string) {
  return await reader.collections.team.read(slug);
}

export async function getAllGalleryItems() {
  return await reader.collections.galleryItems.all();
}

export async function getPatientEducation(slug: string) {
  return await reader.collections.patientEducation.read(slug);
}
