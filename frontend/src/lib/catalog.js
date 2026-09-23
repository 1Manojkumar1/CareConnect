import api from './api';

export async function fetchCategories() {
  const res = await api.get('/categories');
  return res.data.data;
}

export async function fetchSkills(categoryId) {
  const res = await api.get('/skills', { params: categoryId ? { categoryId } : {} });
  return res.data.data;
}

export function topLevel(categories) {
  return categories.filter((c) => !c.parentId);
}

export function subcategoriesOf(categories, parentId) {
  return categories.filter((c) => c.parentId === parentId);
}
