import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCreateInventoryItem } from "../../../src/hooks/use-inventory";
import { api } from "../../../src/lib/api";

const CONDITIONS = [
  { value: "NEW_WITH_TAGS", label: "New with tags" },
  { value: "NEW_WITHOUT_TAGS", label: "New w/o tags" },
  { value: "VERY_GOOD", label: "Very good" },
  { value: "GOOD", label: "Good" },
  { value: "SATISFACTORY", label: "Satisfactory" },
] as const;

interface ImageItem {
  uri: string;
  url?: string;
  key?: string;
  uploading: boolean;
  error?: string;
}

export default function NewInventoryScreen() {
  const router = useRouter();
  const createMutation = useCreateInventoryItem();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [quantity, setQuantity] = useState("1");
  const [costPrice, setCostPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isUploading = images.some((img) => img.uploading);
  const isBusy = createMutation.isPending || isUploading;

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo library access to add images.");
      return;
    }
    if (images.length >= 5) {
      Alert.alert("Limit reached", "You can add up to 5 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5 - images.length,
    });

    if (result.canceled) return;

    const startIndex = images.length;
    const placeholders: ImageItem[] = result.assets.map(
      (a: ImagePicker.ImagePickerAsset) => ({
        uri: a.uri,
        uploading: true,
      })
    );
    setImages((prev) => [...prev, ...placeholders]);

    await Promise.all(
      result.assets.map(async (asset: ImagePicker.ImagePickerAsset, i: number) => {
        const slotIndex = startIndex + i;
        try {
          const { url, key } = await api.uploadImage(
            asset.uri,
            asset.mimeType ?? "image/jpeg"
          );
          setImages((prev) => {
            const next = [...prev];
            if (next[slotIndex]) {
              next[slotIndex] = { uri: asset.uri, url, key, uploading: false };
            }
            return next;
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          setImages((prev) => {
            const next = [...prev];
            if (next[slotIndex]) {
              next[slotIndex] = { ...next[slotIndex]!, uploading: false, error: msg };
            }
            return next;
          });
        }
      })
    );
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty < 1) errs.quantity = "Must be at least 1";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
      condition,
      quantity: Number(quantity) || 1,
      costPrice: costPrice ? Number(costPrice) : undefined,
      targetPrice: targetPrice ? Number(targetPrice) : undefined,
      images: images
        .filter((img) => img.url && img.key)
        .map((img, i) => ({
          url: img.url!,
          key: img.key!,
          isPrimary: i === 0,
          sortOrder: i,
        })),
    };

    try {
      await createMutation.mutateAsync(payload);
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save item.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imageRow}>
              {images.map((img, i) => (
                <View key={i} style={styles.imageSlot}>
                  <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                  {img.uploading && (
                    <View style={styles.imageOverlay}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}
                  {img.error && (
                    <View style={[styles.imageOverlay, styles.imageOverlayError]}>
                      <Feather name="alert-circle" size={14} color="#fff" />
                    </View>
                  )}
                  {i === 0 && !img.uploading && !img.error && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeImage(i)}
                  >
                    <Feather name="x" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                  <Feather name="camera" size={22} color="#9ca3af" />
                  <Text style={styles.addImageText}>Add photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
          <Text style={styles.photoHint}>First photo is the primary image. Up to 5 photos.</Text>
        </View>

        {/* Item Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Details</Text>

          <Field label="Title *" error={errors.title}>
            <TextInput
              style={[styles.input, errors.title ? styles.inputError : null]}
              placeholder="e.g. Vintage Levi 501 Jeans Size 32x30"
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </Field>

          <View style={styles.rowTwo}>
            <Field label="Brand" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Levi's"
                value={brand}
                onChangeText={setBrand}
              />
            </Field>
            <Field label="Category" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Clothing"
                value={category}
                onChangeText={setCategory}
              />
            </Field>
          </View>

          <Field label="Condition">
            <View style={styles.conditionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.conditionChip,
                    condition === c.value && styles.conditionChipActive,
                  ]}
                  onPress={() => setCondition(c.value)}
                >
                  <Text
                    style={[
                      styles.conditionChipText,
                      condition === c.value && styles.conditionChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe condition, measurements, notable details…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Quantity</Text>
          <View style={styles.rowThree}>
            <Field label="Qty" style={{ flex: 1 }} error={errors.quantity}>
              <TextInput
                style={[styles.input, errors.quantity ? styles.inputError : null]}
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </Field>
            <Field label="Cost ($)" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={costPrice}
                onChangeText={setCostPrice}
              />
            </Field>
            <Field label="List price ($)" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={targetPrice}
                onChangeText={setTargetPrice}
              />
            </Field>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, isBusy && styles.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isUploading ? "Uploading photos…" : "Save Item"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 48 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ea580c",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111827",
  },
  inputError: { borderColor: "#ef4444" },
  textarea: { height: 90, paddingTop: 10 },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 3 },
  rowTwo: { flexDirection: "row", gap: 10 },
  rowThree: { flexDirection: "row", gap: 8 },
  conditionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  conditionChip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
  },
  conditionChipActive: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  conditionChipText: { fontSize: 13, color: "#6b7280" },
  conditionChipTextActive: { color: "#ea580c", fontWeight: "600" },
  imageRow: { flexDirection: "row", gap: 10, paddingBottom: 4 },
  imageSlot: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  imageThumb: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlayError: { backgroundColor: "rgba(220,38,38,0.6)" },
  primaryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#ea580c",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  primaryBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addImageBtn: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f9fafb",
  },
  addImageText: { fontSize: 11, color: "#9ca3af" },
  photoHint: { fontSize: 11, color: "#9ca3af", marginTop: 10 },
  saveBtn: {
    backgroundColor: "#ea580c",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
