import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { eq, gte, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { uvDataCache } from "@/shared/schema";
import { retryAsync, niesRetryConfig, NIESApiError, RetryableError } from "@/lib/retry";

interface StationInfo {
  id: string;
  name: string;
  nameEn: string;
  prefecture: string;
  lat: number;
  lng: number;
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

interface NIESJson {
  ivd: string;
  hlthful1: string;
  hlthful2: string;
  time_max: string;
  time_min: string;
  cie: string;
  month: string;
  harmful: string;
  year: string;
  day: string;
}

interface ProcessedUVData {
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

function formatMinutes(val: string): string {
  if (val === "NA") return "欠測";
  const num = Number(val);
  if (num === 0) return "0";
  if (num > 0 && num < 6000) return String(num);
  if (num >= 6000) return "6000+";
  return "-";
}

function formatTimeSlot(timeMin: string, timeMax: string): string {
  const min = Number(timeMin);
  const max = Number(timeMax);
  if (min === max) {
    return `${min}時台 (後半30分)`;
  }
  return `${min}〜${max}時台`;
}

function processNIESJson(json: NIESJson, station: StationInfo): ProcessedUVData {
  return {
    station,
    date: `${json.year}/${json.month}/${json.day}`,
    timeSlot: formatTimeSlot(json.time_min, json.time_max),
    timeMin: json.time_min,
    timeMax: json.time_max,
    faceHands: {
      recommendedMinutes: formatMinutes(json.hlthful1),
      rawValue: json.hlthful1,
    },
    armsLegs: {
      recommendedMinutes: formatMinutes(json.hlthful2),
      rawValue: json.hlthful2,
    },
    sunburn: {
      maxMinutes: formatMinutes(json.harmful),
      rawValue: json.harmful,
    },
    cie: json.cie,
    ivd: json.ivd,
  };
}

async function fetchFromNIES(stationId: string): Promise<{ raw: NIESJson; processed: ProcessedUVData }> {
  const url = `https://db.cger.nies.go.jp/dataset/uv_vitaminD/json/${stationId}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new NIESApiError("Failed to fetch data from NIES", response.status);
  }

  const json: NIESJson = await response.json();
  const station = STATIONS.find(s => s.id === stationId);
  if (!station) {
    throw new Error("Station not found after successful fetch");
  }
  const processed = processNIESJson(json, station);
  return { raw: json, processed };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/stations", (_req: Request, res: Response) => {
    res.json(STATIONS);
  });

  app.get("/api/uv-data/:stationId", async (req: Request, res: Response) => {
    const stationId = req.params.stationId as string;

    const station = STATIONS.find(s => s.id === stationId);
    if (!station) {
      return res.status(404).json({ error: "Station not found" });
    }

    const today = new Date().toISOString().split("T")[0];

    try {
      // Check cache first
      const cached = await db
        .select()
        .from(uvDataCache)
        .where(
          and(
            eq(uvDataCache.stationId, stationId),
            eq(uvDataCache.date, today),
            gte(uvDataCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (cached.length > 0) {
        res.set("X-Cache-Status", "HIT");
        res.set("Cache-Control", "public, max-age=86400");
        return res.json(cached[0].processedData);
      }

      // Cache miss: fetch from NIES with retry
      const { raw, processed } = await retryAsync(
        () => fetchFromNIES(stationId),
        niesRetryConfig
      );

      // Save to cache (expires in 24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(uvDataCache).values({
        stationId,
        date: today,
        rawData: raw,
        processedData: processed,
        expiresAt,
        // fetchedAt is auto-set by defaultNow()
      }).onConflictDoUpdate({
        target: [uvDataCache.stationId, uvDataCache.date],
        set: {
          rawData: raw,
          processedData: processed,
          expiresAt,
          // fetchedAt: update not supported due to Drizzle type constraints
        },
      });

      res.set("X-Cache-Status", "MISS");
      res.set("Cache-Control", "public, max-age=86400");
      res.json(processed);
    } catch (error) {
      let status = 500;
      const logFields: any = {
        type: "uv_data_error",
        stationId,
        timestamp: new Date().toISOString(),
      };

      if (error instanceof NIESApiError) {
        status = error.statusCode >= 500 ? 502 : error.statusCode;
        logFields.message = `NIES API error: ${error.message}`;
        logFields.statusCode = error.statusCode;
      } else if (error instanceof RetryableError) {
        status = 502;
        logFields.message = `Retry failed: ${error.message}`;
        logFields.attempt = error.attempt;
      } else if (error instanceof Error) {
        logFields.message = error.message;
        logFields.errorName = error.name;
        status = 500;
      } else {
        logFields.message = "Unknown error";
        status = 500;
      }

      logFields.statusCode = status;
      console.error(JSON.stringify(logFields));

      res.status(status).json({ error: "Failed to fetch UV data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
