// Cache utilities for Next.js
import { unstable_cache } from 'next/cache';
import sql from './db';

// Cache duration constants
export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
};

// Cached categories fetch
export async function getCachedCategories() {
  return unstable_cache(
    async () => {
      const categories = await sql`
        SELECT id, name, slug, discount_percent, icon, sort_order
        FROM categories
        WHERE is_active = true
        ORDER BY sort_order ASC
      `;

      return categories.map((cat: any) => {
        // Parse discount_percent đảm bảo luôn là số hợp lệ
        let discountPercent = 0;
        if (cat.discount_percent !== null && cat.discount_percent !== undefined) {
          const value = cat.discount_percent;
          if (typeof value === 'number') {
            discountPercent = Math.floor(value);
          } else if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            discountPercent = isNaN(parsed) ? 0 : parsed;
          } else {
            const parsed = Number(value);
            discountPercent = isNaN(parsed) ? 0 : Math.floor(parsed);
          }
        }

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          discount_percent: discountPercent,
          icon: cat.icon,
          sort_order: cat.sort_order || 0,
        };
      });
    },
    ['categories'],
    {
      revalidate: CACHE_DURATION.MEDIUM, // 5 minutes
      tags: ['categories'],
    }
  )();
}

// Cached settings fetch
export async function getCachedSetting(key: string, defaultValue?: string) {
  return unstable_cache(
    async () => {
      const result = await sql`
        SELECT value, description, updated_at 
        FROM settings 
        WHERE key = ${key}
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (result.length === 0) {
        return defaultValue || null;
      }

      return {
        value: result[0].value,
        description: result[0].description,
        updated_at: result[0].updated_at,
      };
    },
    [`setting-${key}`],
    {
      revalidate: CACHE_DURATION.MEDIUM, // 5 minutes
      tags: [`setting-${key}`],
    }
  )();
}

// Helper to revalidate cache tags
export function revalidateCache(tags: string[]) {
  // This would be used with Next.js revalidateTag in production
  // For now, it's a placeholder
  return tags;
}

