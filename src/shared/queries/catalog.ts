import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, extractData } from '../services/api';

// Query keys centralizadas (dedupe + invalidación consistente).
export const catalogKeys = {
  all: ['catalog'] as const,
  categories: ['catalog', 'categories'] as const,
  productsRoot: ['catalog', 'products'] as const,
  products: (categoryId?: string) => ['catalog', 'products', categoryId ?? 'all'] as const,
  product: (id: string) => ['catalog', 'product', id] as const,
};

// ── Lecturas ──────────────────────────────────────────────
export function useCatalogCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: async () => {
      const data = extractData(await apiService.getCatalogCategories());
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCatalogProducts(categoryId?: string) {
  return useQuery({
    queryKey: catalogKeys.products(categoryId),
    queryFn: async () => {
      const data = extractData(await apiService.getCatalogProducts(categoryId));
      return Array.isArray(data) ? data : [];
    },
    enabled: categoryId !== undefined ? !!categoryId : true,
  });
}

export function useCatalogProduct(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.product(id ?? ''),
    queryFn: async () => extractData(await apiService.getCatalogProduct(id!)),
    enabled: !!id,
  });
}

// ── Mutaciones (invalidan la key correspondiente) ─────────
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.createCatalogCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.categories }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteCatalogCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.categories }),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.createCatalogProduct(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.productsRoot }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteCatalogProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.productsRoot }),
  });
}

export function useAddPrice(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiService.addCatalogPrice(productId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.product(productId) }),
  });
}

export function useDeletePrice(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (priceId: string) => apiService.deleteCatalogPrice(productId, priceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.product(productId) }),
  });
}
