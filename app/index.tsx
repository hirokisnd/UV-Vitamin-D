import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface StationInfo {
  id: string;
  name: string;
  nameEn: string;
  prefecture: string;
  lat: number;
  lng: number;
}

interface UVResponse {
  station: StationInfo;
  date: string;
  timeSlot: string;
  timeMin: string;
  timeMax: string;
  faceHands: { recommendedMinutes: string; rawValue: string };
  armsLegs: { recommendedMinutes: string; rawValue: string };
  sunburn: { maxMinutes: string; rawValue: string };
  cie: string;
  ivd: string;
}

const STATIONS: StationInfo[] = [
  { id: "ochiishi", name: "落石岬", nameEn: "Ochiishi", prefecture: "北海道", lat: 43.16, lng: 145.50 },
  { id: "rikubetsu", name: "陸別", nameEn: "Rikubetsu", prefecture: "北海道", lat: 43.45, lng: 143.77 },
  { id: "sapporo", name: "札幌", nameEn: "Sapporo", prefecture: "北海道", lat: 43.08, lng: 141.33 },
  { id: "aomori", name: "青森", nameEn: "Aomori", prefecture: "青森県", lat: 40.78, lng: 140.78 },
  { id: "sendai", name: "仙台", nameEn: "Sendai", prefecture: "宮城県", lat: 38.25, lng: 140.87 },
  { id: "tsukuba", name: "つくば", nameEn: "Tsukuba", prefecture: "茨城県", lat: 36.05, lng: 140.12 },
  { id: "yokohama", name: "横浜", nameEn: "Yokohama", prefecture: "神奈川県", lat: 35.47, lng: 139.59 },
  { id: "nagoya", name: "名古屋", nameEn: "Nagoya", prefecture: "愛知県", lat: 35.15, lng: 136.97 },
  { id: "ootsu", name: "大津", nameEn: "Otsu", prefecture: "滋賀県", lat: 35.03, lng: 135.87 },
  { id: "osaka", name: "大阪", nameEn: "Osaka", prefecture: "大阪府", lat: 34.65, lng: 135.59 },
  { id: "hateruma", name: "波照間", nameEn: "Hateruma", prefecture: "沖縄県", lat: 24.05, lng: 123.81 },
];

const FAVORITE_KEY = "uv_favorite_station";

async function fetchUVData(stationId: string): Promise<UVResponse> {
  const baseUrl = getApiUrl();
  const url = new URL(`/api/uv-data/${stationId}`, baseUrl);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch UV data");
  return res.json();
}

function parseMinutes(val: string): number | null {
  if (val === "-" || val === "" || val === "欠測" || val === "0") return null;
  if (val === "6000+") return 6000;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function getVitDLevel(minutes: number | null): { label: string; color: string; iconName: string } {
  if (minutes === null) return { label: "データなし", color: Colors.textMuted, iconName: "cloud-outline" };
  if (minutes <= 10) return { label: "短時間でOK", color: Colors.success, iconName: "sunny" };
  if (minutes <= 30) return { label: "適度な日光浴を", color: Colors.primary, iconName: "partly-sunny" };
  if (minutes <= 60) return { label: "やや長めに", color: Colors.warning, iconName: "cloudy" };
  return { label: "60分以上必要", color: Colors.textMuted, iconName: "cloud-outline" };
}

function getSunburnLevel(minutes: number | null): { label: string; color: string } {
  if (minutes === null) return { label: "データなし", color: Colors.textMuted };
  if (minutes <= 20) return { label: "要注意", color: Colors.danger };
  if (minutes <= 40) return { label: "やや注意", color: Colors.warning };
  return { label: "比較的安全", color: Colors.success };
}

function StationSelector({
  stations,
  selectedId,
  onSelect,
}: {
  stations: StationInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={selectorStyles.container}>
      <Text style={selectorStyles.title}>観測局</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={selectorStyles.scrollContent}
      >
        {stations.map((station) => {
          const isSelected = station.id === selectedId;
          return (
            <Pressable
              key={station.id}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                onSelect(station.id);
              }}
              style={({ pressed }) => [
                selectorStyles.chip,
                isSelected && selectorStyles.chipSelected,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[
                  selectorStyles.chipText,
                  isSelected && selectorStyles.chipTextSelected,
                ]}
              >
                {station.name}
              </Text>
              <Text
                style={[
                  selectorStyles.chipSubtext,
                  isSelected && selectorStyles.chipSubtextSelected,
                ]}
              >
                {station.prefecture}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ExposureToggle({
  type,
  onToggle,
}: {
  type: "faceHands" | "armsLegs";
  onToggle: (type: "faceHands" | "armsLegs") => void;
}) {
  return (
    <View style={toggleStyles.container}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
          onToggle("faceHands");
        }}
        style={[
          toggleStyles.button,
          type === "faceHands" && toggleStyles.buttonActive,
        ]}
      >
        <MaterialCommunityIcons
          name="hand-wave-outline"
          size={18}
          color={type === "faceHands" ? Colors.background : Colors.textSecondary}
        />
        <Text
          style={[
            toggleStyles.buttonText,
            type === "faceHands" && toggleStyles.buttonTextActive,
          ]}
        >
          顔と手 (600cm²)
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
          onToggle("armsLegs");
        }}
        style={[
          toggleStyles.button,
          type === "armsLegs" && toggleStyles.buttonActive,
        ]}
      >
        <MaterialCommunityIcons
          name="human-handsup"
          size={18}
          color={type === "armsLegs" ? Colors.background : Colors.textSecondary}
        />
        <Text
          style={[
            toggleStyles.buttonText,
            type === "armsLegs" && toggleStyles.buttonTextActive,
          ]}
        >
          腕と脚も (1200cm²)
        </Text>
      </Pressable>
    </View>
  );
}

function DataCard({
  data,
  exposureType,
}: {
  data: UVResponse;
  exposureType: "faceHands" | "armsLegs";
}) {
  const recRaw = exposureType === "faceHands"
    ? data.faceHands.recommendedMinutes
    : data.armsLegs.recommendedMinutes;
  const maxRaw = data.sunburn.maxMinutes;

  const recMinutes = parseMinutes(recRaw);
  const maxMinutes = parseMinutes(maxRaw);
  const vitDLevel = getVitDLevel(recMinutes);
  const sunburnLevel = getSunburnLevel(maxMinutes);

  const displayRec = recMinutes !== null ? `${recMinutes}` : "-";
  const displayMax = maxMinutes !== null ? `${maxMinutes}` : "-";

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={cardStyles.dateRow}>
          <Feather name="calendar" size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.dateText}>{data.date}</Text>
        </View>
        <View style={cardStyles.timeRow}>
          <Feather name="clock" size={14} color={Colors.textSecondary} />
          <Text style={cardStyles.timeText}>{data.timeSlot}</Text>
        </View>
      </View>

      <View style={cardStyles.mainDataSection}>
        <View style={cardStyles.dataColumn}>
          <Ionicons
            name={vitDLevel.iconName as any}
            size={32}
            color={vitDLevel.color}
          />
          <Text style={cardStyles.sectionLabel}>ビタミンD生成</Text>
          <Text style={cardStyles.sectionSubLabel}>必要な照射時間</Text>
          <View style={cardStyles.minutesRow}>
            <Text style={[cardStyles.minutesValue, { color: vitDLevel.color }]}>
              {displayRec}
            </Text>
            {recMinutes !== null && (
              <Text style={cardStyles.minutesUnit}>分</Text>
            )}
          </View>
          <View style={[cardStyles.levelBadge, { backgroundColor: vitDLevel.color + "20" }]}>
            <Text style={[cardStyles.levelText, { color: vitDLevel.color }]}>
              {vitDLevel.label}
            </Text>
          </View>
        </View>

        <View style={cardStyles.divider} />

        <View style={cardStyles.dataColumn}>
          <MaterialCommunityIcons
            name="shield-sun-outline"
            size={32}
            color={sunburnLevel.color}
          />
          <Text style={cardStyles.sectionLabel}>紅斑 (日焼け)</Text>
          <Text style={cardStyles.sectionSubLabel}>この時間以上は避けて</Text>
          <View style={cardStyles.minutesRow}>
            <Text style={[cardStyles.minutesValue, { color: sunburnLevel.color }]}>
              {displayMax}
            </Text>
            {maxMinutes !== null && (
              <Text style={cardStyles.minutesUnit}>分</Text>
            )}
          </View>
          <View style={[cardStyles.levelBadge, { backgroundColor: sunburnLevel.color + "20" }]}>
            <Text style={[cardStyles.levelText, { color: sunburnLevel.color }]}>
              {sunburnLevel.label}
            </Text>
          </View>
        </View>
      </View>

      {data.cie !== "NA" && data.ivd !== "NA" && (
        <View style={cardStyles.extraDataRow}>
          <View style={cardStyles.extraDataItem}>
            <Text style={cardStyles.extraDataLabel}>紅斑紫外線量</Text>
            <Text style={cardStyles.extraDataValue}>{data.cie} W/m²</Text>
          </View>
          <View style={cardStyles.extraDataDivider} />
          <View style={cardStyles.extraDataItem}>
            <Text style={cardStyles.extraDataLabel}>ビタミンD紫外線量</Text>
            <Text style={cardStyles.extraDataValue}>{data.ivd} W/m²</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function EmptyDataCard() {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.emptyState}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
        <Text style={cardStyles.emptyText}>データを取得できませんでした</Text>
        <Text style={cardStyles.emptySubtext}>しばらくしてから再試行してください</Text>
      </View>
    </View>
  );
}

function InfoSection() {
  return (
    <View style={infoStyles.container}>
      <View style={infoStyles.header}>
        <Feather name="info" size={16} color={Colors.primary} />
        <Text style={infoStyles.title}>データについて</Text>
      </View>
      <Text style={infoStyles.text}>
        国立環境研究所の観測データに基づき、10µgのビタミンDを生成するために必要な日光照射時間を表示しています。スキンタイプIII（日本人標準）を基準としています。
      </Text>
      <View style={infoStyles.tipRow}>
        <MaterialCommunityIcons name="lightbulb-outline" size={14} color={Colors.warning} />
        <Text style={infoStyles.tipText}>
          肌の露出面積を広げると必要時間が短くなります
        </Text>
      </View>
      <Text style={infoStyles.source}>
        出典: 国立環境研究所 ビタミンD生成・紅斑紫外線量情報
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedStation, setSelectedStation] = useState("tsukuba");
  const [exposureType, setExposureType] = useState<"faceHands" | "armsLegs">("faceHands");
  const [favoriteStation, setFavoriteStation] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITE_KEY).then((val) => {
      if (val) {
        setFavoriteStation(val);
        setSelectedStation(val);
      }
    });
  }, []);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<UVResponse>({
    queryKey: ["uv-data", selectedStation],
    queryFn: () => fetchUVData(selectedStation),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const station = STATIONS.find((s) => s.id === selectedStation);

  const toggleFavorite = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (favoriteStation === selectedStation) {
      await AsyncStorage.removeItem(FAVORITE_KEY);
      setFavoriteStation(null);
    } else {
      await AsyncStorage.setItem(FAVORITE_KEY, selectedStation);
      setFavoriteStation(selectedStation);
    }
  }, [favoriteStation, selectedStation]);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd, Colors.backgroundLight]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopPadding,
            paddingBottom: insets.bottom + 24 + webBottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.appTitle}>UV Info</Text>
              <Text style={styles.appSubtitle}>紫外線照射時間情報（速報値）</Text>
            </View>
            <Pressable
              onPress={toggleFavorite}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Ionicons
                name={favoriteStation === selectedStation ? "star" : "star-outline"}
                size={24}
                color={favoriteStation === selectedStation ? Colors.primary : Colors.textSecondary}
              />
            </Pressable>
          </View>

          {station && (
            <View style={styles.stationNameContainer}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.stationName}>{station.name}局</Text>
              <Text style={styles.stationPrefecture}>{station.prefecture}</Text>
            </View>
          )}
        </View>

        <StationSelector
          stations={STATIONS}
          selectedId={selectedStation}
          onSelect={setSelectedStation}
        />

        <ExposureToggle type={exposureType} onToggle={setExposureType} />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>データを取得中...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
            <Text style={styles.errorText}>データの取得に失敗しました</Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="refresh-cw" size={16} color={Colors.text} />
              <Text style={styles.retryText}>再試行</Text>
            </Pressable>
          </View>
        ) : data ? (
          <DataCard data={data} exposureType={exposureType} />
        ) : (
          <EmptyDataCard />
        )}

        <InfoSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  appTitle: {
    fontSize: 28,
    fontFamily: "NotoSansJP_700Bold",
    color: Colors.text,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stationNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  stationName: {
    fontSize: 20,
    fontFamily: "NotoSansJP_700Bold",
    color: Colors.text,
  },
  stationPrefecture: {
    fontSize: 14,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textSecondary,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textSecondary,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.textSecondary,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.text,
  },
});

const selectorStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.text,
  },
  chipTextSelected: {
    color: Colors.background,
  },
  chipSubtext: {
    fontSize: 10,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  chipSubtextSelected: {
    color: Colors.backgroundLight,
  },
});

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonActive: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.textSecondary,
  },
  buttonTextActive: {
    color: Colors.background,
  },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textSecondary,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textSecondary,
  },
  mainDataSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  dataColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "NotoSansJP_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  sectionSubLabel: {
    fontSize: 10,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  minutesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  minutesValue: {
    fontSize: 40,
    fontFamily: "NotoSansJP_700Bold",
  },
  minutesUnit: {
    fontSize: 16,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.textSecondary,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 11,
    fontFamily: "NotoSansJP_500Medium",
  },
  divider: {
    width: 1,
    height: "80%",
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  extraDataRow: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: "center",
  },
  extraDataItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  extraDataLabel: {
    fontSize: 10,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textMuted,
  },
  extraDataValue: {
    fontSize: 14,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.textSecondary,
  },
  extraDataDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "NotoSansJP_500Medium",
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textMuted,
  },
});

const infoStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: "NotoSansJP_700Bold",
    color: Colors.text,
  },
  text: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: Colors.warning + "10",
    borderRadius: 8,
    padding: 10,
  },
  tipText: {
    fontSize: 12,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.warning,
    flex: 1,
  },
  source: {
    fontSize: 10,
    fontFamily: "NotoSansJP_400Regular",
    color: Colors.textMuted,
    marginTop: 10,
  },
});
