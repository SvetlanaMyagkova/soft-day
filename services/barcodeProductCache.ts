import AsyncStorage from '@react-native-async-storage/async-storage';

import { OpenFoodFactsProduct } from './openFoodFacts';

const BARCODE_PRODUCT_CACHE_KEY = 'soft-day-barcode-product-cache';

type BarcodeProductCache = Record<string, OpenFoodFactsProduct>;

const normalizeBarcode = (barcode: string) => {
  return barcode.replace(/\D/g, '');
};

export const getCachedProductByBarcode = async (
  barcode: string
): Promise<OpenFoodFactsProduct | null> => {
  try {
    const cleanBarcode = normalizeBarcode(barcode);

    if (!cleanBarcode) {
      return null;
    }

    const cacheRaw = await AsyncStorage.getItem(BARCODE_PRODUCT_CACHE_KEY);
    const cache: BarcodeProductCache = cacheRaw ? JSON.parse(cacheRaw) : {};

    return cache[cleanBarcode] || null;
  } catch (error) {
    return null;
  }
};

export const saveProductToBarcodeCache = async (
  product: OpenFoodFactsProduct
) => {
  try {
    const cleanBarcode = normalizeBarcode(product.barcode);

    if (!cleanBarcode) {
      return;
    }

    const cacheRaw = await AsyncStorage.getItem(BARCODE_PRODUCT_CACHE_KEY);
    const cache: BarcodeProductCache = cacheRaw ? JSON.parse(cacheRaw) : {};

    const updatedCache: BarcodeProductCache = {
      ...cache,
      [cleanBarcode]: {
        ...product,
        barcode: cleanBarcode,
      },
    };

    await AsyncStorage.setItem(
      BARCODE_PRODUCT_CACHE_KEY,
      JSON.stringify(updatedCache)
    );
  } catch (error) {
    return;
  }
};