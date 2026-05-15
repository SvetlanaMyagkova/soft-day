import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getCachedProductByBarcode,
  saveProductToBarcodeCache,
} from '../services/barcodeProductCache';
import {
  OpenFoodFactsProduct,
  getProductByBarcode,
} from '../services/openFoodFacts';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
};

const normalizeNumber = (value: string) => {
  const number = Number(value.replace(',', '.').replace(/\s/g, ''));

  return Number.isFinite(number) ? number : 0;
};

const normalizeBarcode = (value: string) => {
  return value.replace(/\D/g, '');
};

export default function BarcodeScannerScreen() {
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [lastBarcode, setLastBarcode] = useState('');
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [productSource, setProductSource] = useState<
    'cache' | 'openFoodFacts' | 'manual' | null
  >(null);

  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');

  const handleRequestPermission = async () => {
    const result = await requestPermission();

    if (!result.granted) {
      Alert.alert(
        'Нет доступа к камере',
        'Чтобы сканировать штрих-код, нужно разрешить доступ к камере.'
      );
    }
  };

  const clearManualForm = () => {
    setManualName('');
    setManualBrand('');
    setManualCalories('');
    setManualProtein('');
    setManualFat('');
    setManualCarbs('');
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || isLoadingProduct) {
      return;
    }

    const cleanBarcode = normalizeBarcode(result.data);

    setScanned(true);
    setLastBarcode(cleanBarcode || result.data);
    setProduct(null);
    setProductNotFound(false);
    setProductSource(null);
    clearManualForm();
    setIsLoadingProduct(true);

    try {
      const cachedProduct = await getCachedProductByBarcode(result.data);

      if (cachedProduct) {
        setProduct(cachedProduct);
        setProductSource('cache');
        return;
      }

      const foundProduct = await getProductByBarcode(result.data);

      if (!foundProduct) {
        setProductNotFound(true);
        return;
      }

      setProduct(foundProduct);
      setProductSource('openFoodFacts');

      await saveProductToBarcodeCache(foundProduct);
    } catch (error) {
      setProductNotFound(true);
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const saveManualProduct = async () => {
    const cleanBarcode = normalizeBarcode(lastBarcode);

    if (!cleanBarcode) {
      Alert.alert('Нет штрих-кода', 'Сначала отсканируй продукт.');
      return;
    }

    if (!manualName.trim()) {
      Alert.alert('Не хватает названия', 'Напиши название продукта.');
      return;
    }

    const manualProduct: OpenFoodFactsProduct = {
      barcode: cleanBarcode,
      name: manualName.trim(),
      brand: manualBrand.trim() || undefined,
      caloriesPer100g: Math.round(normalizeNumber(manualCalories)),
      proteinPer100g: normalizeNumber(manualProtein),
      fatPer100g: normalizeNumber(manualFat),
      carbsPer100g: normalizeNumber(manualCarbs),
    };

    await saveProductToBarcodeCache(manualProduct);

    setProduct(manualProduct);
    setProductSource('manual');
    setProductNotFound(false);

    Alert.alert(
      'Сохранено',
      'Продукт привязан к штрих-коду. В следующий раз Soft Day найдёт его сразу.'
    );
  };

  const resetScanner = () => {
    setScanned(false);
    setProduct(null);
    setProductNotFound(false);
    setProductSource(null);
    setLastBarcode('');
    setIsLoadingProduct(false);
    clearManualForm();
  };

  if (!permission) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.message}>Проверяем доступ к камере…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.title}>Сканер продукта</Text>

        <Text style={styles.message}>
          Для сканирования штрих-кода нужен доступ к камере.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRequestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Разрешить камеру</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.screen}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>← Назад</Text>
          </TouchableOpacity>

          {!scanned ? (
            <View style={styles.scanBox}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
          ) : null}

          <View style={styles.bottomPanel}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bottomPanelContent}
            >
              <Text style={styles.bottomTitle}>
                {scanned ? 'Результат сканирования' : 'Наведи камеру на штрих-код'}
              </Text>

              <Text style={styles.bottomText}>
                {scanned
                  ? 'Проверь найденные данные или добавь продукт вручную.'
                  : 'Держи упаковку ровно, чтобы штрих-код был внутри рамки.'}
              </Text>

              {isLoadingProduct ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>Ищем продукт…</Text>
                </View>
              ) : null}

              {lastBarcode ? (
                <Text style={styles.lastBarcode}>Код: {lastBarcode}</Text>
              ) : null}

              {product ? (
                <View style={styles.productCard}>
                  <Text style={styles.productTitle}>{product.name}</Text>

                  {product.brand ? (
                    <Text style={styles.productBrand}>{product.brand}</Text>
                  ) : null}

                  <Text style={styles.productNutrition}>
                    {product.caloriesPer100g} ккал на 100 г
                  </Text>

                  <Text style={styles.productMacros}>
                    Б {product.proteinPer100g} г · Ж {product.fatPer100g} г · У{' '}
                    {product.carbsPer100g} г
                  </Text>

                  {productSource ? (
                    <Text style={styles.productSource}>
                      {productSource === 'cache'
                        ? 'Источник: сохранено в Soft Day'
                        : productSource === 'manual'
                          ? 'Источник: добавлено вручную'
                          : 'Источник: Open Food Facts'}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {productNotFound && !isLoadingProduct ? (
                <View style={styles.notFoundCard}>
                  <Text style={styles.notFoundTitle}>Продукт не найден</Text>
                  <Text style={styles.notFoundText}>
                    Можно добавить его вручную. Soft Day сохранит продукт и будет
                    узнавать этот штрих-код в следующий раз.
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Название продукта"
                    placeholderTextColor={colors.mutedText}
                    value={manualName}
                    onChangeText={setManualName}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Бренд, если есть"
                    placeholderTextColor={colors.mutedText}
                    value={manualBrand}
                    onChangeText={setManualBrand}
                  />

                  <Text style={styles.fieldLabel}>На 100 г / 100 мл</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Ккал"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="number-pad"
                    value={manualCalories}
                    onChangeText={setManualCalories}
                  />

                  <View style={styles.macroRow}>
                    <TextInput
                      style={styles.macroInput}
                      placeholder="Белки"
                      placeholderTextColor={colors.mutedText}
                      keyboardType="decimal-pad"
                      value={manualProtein}
                      onChangeText={setManualProtein}
                    />

                    <TextInput
                      style={styles.macroInput}
                      placeholder="Жиры"
                      placeholderTextColor={colors.mutedText}
                      keyboardType="decimal-pad"
                      value={manualFat}
                      onChangeText={setManualFat}
                    />

                    <TextInput
                      style={styles.macroInput}
                      placeholder="Углеводы"
                      placeholderTextColor={colors.mutedText}
                      keyboardType="decimal-pad"
                      value={manualCarbs}
                      onChangeText={setManualCarbs}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={saveManualProduct}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>
                      Сохранить продукт
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {scanned ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={resetScanner}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryButtonText}>Сканировать ещё</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    paddingTop: 70,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 14,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.hunterGreen,
    fontSize: 15,
    fontWeight: '800',
  },
  scanBox: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: 270,
    height: 170,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 46,
    height: 46,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: colors.surface,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 46,
    height: 46,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: colors.surface,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 46,
    height: 46,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: colors.surface,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 46,
    height: 46,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: colors.surface,
    borderBottomRightRadius: 12,
  },
  bottomPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 34,
    maxHeight: '56%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomPanelContent: {
    padding: 18,
  },
  bottomTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
  },
  bottomText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
  },
  lastBarcode: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginTop: 12,
  },
  productCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    marginBottom: 10,
  },
  productNutrition: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 4,
  },
  productMacros: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
  },
  productSource: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.mutedText,
    marginTop: 8,
  },
  notFoundCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  notFoundTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.softRed,
    marginBottom: 6,
  },
  notFoundText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.deepBrown,
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.deepBrown,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: colors.hunterGreen,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.hunterGreen,
    fontSize: 16,
    fontWeight: '900',
  },
});