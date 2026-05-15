import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
};

export default function BarcodeScannerScreen() {
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastBarcode, setLastBarcode] = useState('');

  const handleRequestPermission = async () => {
    const result = await requestPermission();

    if (!result.granted) {
      Alert.alert(
        'Нет доступа к камере',
        'Чтобы сканировать штрих-код, нужно разрешить доступ к камере.'
      );
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) {
      return;
    }

    setScanned(true);
    setLastBarcode(result.data);

    Alert.alert('Штрих-код найден', result.data, [
      {
        text: 'Сканировать ещё',
        onPress: () => setScanned(false),
      },
      {
        text: 'Назад',
        onPress: () => router.back(),
      },
    ]);
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

        <View style={styles.scanBox}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>

        <View style={styles.bottomPanel}>
          <Text style={styles.bottomTitle}>Наведи камеру на штрих-код</Text>

          <Text style={styles.bottomText}>
            Держи упаковку ровно, чтобы штрих-код был внутри рамки.
          </Text>

          {lastBarcode ? (
            <Text style={styles.lastBarcode}>Последний код: {lastBarcode}</Text>
          ) : null}

          {scanned ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setScanned(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Сканировать ещё</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
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
    alignSelf: 'center',
    width: 270,
    height: 180,
    position: 'relative',
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
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
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
  lastBarcode: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: colors.hunterGreen,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 16,
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
    marginTop: 10,
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