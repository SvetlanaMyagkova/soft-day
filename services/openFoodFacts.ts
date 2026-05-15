export type OpenFoodFactsProduct = {
    barcode: string;
    name: string;
    brand?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    carbsPer100g: number;
    imageUrl?: string;
  };
  
  type OpenFoodFactsResponse = {
    status?: number;
    status_verbose?: string;
    product?: {
      product_name?: string;
      product_name_ru?: string;
      product_name_en?: string;
      brands?: string;
      image_url?: string;
      nutriments?: {
        ['energy-kcal_100g']?: number | string;
        ['energy-kcal']?: number | string;
        proteins_100g?: number | string;
        fat_100g?: number | string;
        carbohydrates_100g?: number | string;
      };
    };
  };
  
  const OPEN_FOOD_FACTS_BASE_URL =
    'https://world.openfoodfacts.org/api/v2/product';
  
  const REQUEST_TIMEOUT_MS = 8000;
  
  const normalizeNumber = (value: unknown) => {
    const number = Number(value);
  
    return Number.isFinite(number) ? number : 0;
  };
  
  const fetchWithTimeout = async (url: string, timeoutMs: number) => {
    const controller = new AbortController();
  
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SoftDay/1.0',
          Accept: 'application/json',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  export const getProductByBarcode = async (
    barcode: string
  ): Promise<OpenFoodFactsProduct | null> => {
    const cleanBarcode = barcode.replace(/\D/g, '');
  
    if (!cleanBarcode) {
      return null;
    }
  
    const fields = [
      'product_name',
      'product_name_ru',
      'product_name_en',
      'brands',
      'image_url',
      'nutriments',
    ].join(',');
  
    const url = `${OPEN_FOOD_FACTS_BASE_URL}/${cleanBarcode}.json?fields=${fields}`;
  
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
  
    if (!response.ok) {
      return null;
    }
  
    const data: OpenFoodFactsResponse = await response.json();
  
    if (data.status !== 1 || !data.product) {
      return null;
    }
  
    const product = data.product;
    const nutriments = product.nutriments || {};
  
    const name =
      product.product_name_ru ||
      product.product_name ||
      product.product_name_en ||
      '';
  
    if (!name.trim()) {
      return null;
    }
  
    return {
      barcode: cleanBarcode,
      name: name.trim(),
      brand: product.brands,
      imageUrl: product.image_url,
      caloriesPer100g: Math.round(
        normalizeNumber(
          nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal']
        )
      ),
      proteinPer100g: normalizeNumber(nutriments.proteins_100g),
      fatPer100g: normalizeNumber(nutriments.fat_100g),
      carbsPer100g: normalizeNumber(nutriments.carbohydrates_100g),
    };
  };