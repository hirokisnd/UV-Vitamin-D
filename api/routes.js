const http = require('node:http');

const STATIONS = [
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

function formatMinutes(val) {
  if (val === "NA") return "欠測";
  const num = Number(val);
  if (num === 0) return "0";
  if (num > 0 && num < 6000) return String(num);
  if (num >= 6000) return "6000+";
  return "-";
}

function formatTimeSlot(timeMin, timeMax) {
  const min = Number(timeMin);
  const max = Number(timeMax);
  if (min === 0 && max === 0) return "0分";
  if (min === 0 && max > 0) return `空気良い（${max}分以下）`;
  if (min > 0 && max === 0) return `空気良くない（${min}分以上）`;
  if (min > 0 && max > 0) return `空気良くない（${min}分以上）`;
  return "-";
}

function formatUVIndex(val) {
  if (val === "NA") return "欠測";
  const num = Number(val);
  if (num >= 0 && num < 3) return "弱い";
  if (num >= 3 && num < 6) return "中程度";
  if (num >= 6 && num < 8) return "強い";
  if (num >= 8 && num < 11) return "非常に強い";
  if (num >= 11) return "極端に強い";
  return "-";
}

const registerRoutes = (app) => {
  app.get("/api/stations", (req, res) => {
    res.json(STATIONS);
  });

  app.get("/api/uv/:stationId", async (req, res) => {
    const { stationId } = req.params;
    const station = STATIONS.find((s) => s.id === stationId);
    
    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    try {
      const response = await fetch(`https://www.nies.go.jp/uv-vitamin-d/api/uv/${stationId}.json`);
      if (!response.ok) throw new Error("Failed to fetch from NIES");
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Error fetching UV data for ${stationId}:`, error);
      res.status(500).json({ message: "Error fetching data from NIES" });
    }
  });

  const httpServer = http.createServer(app);
  return httpServer;
};

module.exports = { registerRoutes };
