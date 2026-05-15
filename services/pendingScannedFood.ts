import AsyncStorage from '@react-native-async-storage/async-storage';

import { OpenFoodFactsProduct } from './openFoodFacts';

export type PendingScannedMealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type PendingScannedFoodProduct = {
  mealId: PendingScannedMealId;
  product: OpenFoodFactsProduct;
};

const PENDING_SCANNED_FOOD_KEY = 'soft-day-pending-scanned-food';

export const savePendingScannedFoodProduct = async (
  pendingProduct: PendingScannedFoodProduct
) => {
  await AsyncStorage.setItem(
    PENDING_SCANNED_FOOD_KEY,
    JSON.stringify(pendingProduct)
  );
};

export const consumePendingScannedFoodProduct = async () => {
  const pendingRaw = await AsyncStorage.getItem(PENDING_SCANNED_FOOD_KEY);

  if (!pendingRaw) {
    return null;
  }

  await AsyncStorage.removeItem(PENDING_SCANNED_FOOD_KEY);

  return JSON.parse(pendingRaw) as PendingScannedFoodProduct;
};