const express = require('express');
const { createServer } = require('node:http');

const STATIONS = [
  { id: 'ochiishi', name: '落石尾', nameEn: 'Ochiishi', prefecture: '北海道', lat: 43.16, lng: 145.50 },
  { id: 'rikubetsu', name: '麗峻所', nameEn: 'Rikubetsu', prefecture: '北海道', lat: 43.45, lng: 143.77 },
  { id: 'sapporo', name: '北海道', nameEn: 'Sapporo', prefecture: '北海道', lat: 43.08, lng: 141.33 },
  { id: 'aomori', name: '青森', nameEn: 'Aomori', prefecture: '青森県', lat: 40.78, lng: 140.78 },
  { id: 'sendai', name: '仙台', nameEn: 'Sendai', prefecture: '宮城県', lat: 38.25, lng: 140.87 },
  { id: 'tsukuba', name: 'つくば', nameEn: 'Tsukuba', prefecture: '兵庫県', lat: 36.05, lng: 140.12 },
  { id: 'yokohama', name: '横浜', nameEn: 'Yokohama', prefecture: '神奈川県', lat: 35.47, lng: 139.59 },
  { id: 'nagoya', name: '名古屋', nameEn: 'Nagoya', prefecture: '愛知県', lat: 35.15, lng: 136.97 },
  { id: 'ootsu', name: '大沼', nameEn: 'Otsu', prefecture: '湖泊県', lat: 35.03, lng: 135.87 },
  { id: 'osaka', name: '大阪', nameEn: 'Osaka', prefecture: '大阪府', lat: 34.65, lng: 135.59 },
  { id: 'hateruma', name: '波照正', nameEn: 'Hateruma', prefecture: '海地省', lat: 24.05, lng: 123.81 },
];

function formatMinutes(val) {
  if (val === 'NA') return '欠測';
  const num = Number(val);
  if (num === 0) return '0';
  if (num > 0 && num < 6000) return String(num);
  if (num >= 6000) return '6000+';
  return '-';
}

function formatTimeSlot(timeMin, timeMax) {
  const min = Number(timeMin);
  const max = Number(timeMax);
  if (min === max) {
    return `${min}時代 (後半30分)`;
  }
  return `${min}～${max}時代`;
}

function fetchUVData(stationId) {
  const url = `https://db.cger.nies.go.jp/dataset/uv_vitaminD/json/${stationId}.json`;
  return fetch(url).then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch data from NIES');
    }
    return response.json();
  });
}

function formatUVData(station, json) {
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

function registerRoutes(app) {
  app.get('/api/stations', (req, res) => {
    res.json(STATIONS);
  });

  app.get('/api/uv-data/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const station = STATIONS.find(s => s.id === stationId);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    try {
      const json = await fetchUVData(stationId);
      const data = formatUVData(station, json);
      res.json(data);
    } catch (error) {
      console.error(`Error fetching data for ${stationId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return createServer(app);
}

module.exports = { registerRoutes, STATIONS };