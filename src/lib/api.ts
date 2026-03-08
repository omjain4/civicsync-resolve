import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? 'https://civic-sih-backend.onrender.com/api' : 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- AI Analysis API Functions ---

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: string;
  topScore: number;
  message: string;
  duplicates: Array<{
    reportId: string;
    title: string;
    description: string;
    category: string;
    address: string;
    scores: { composite: number; text: number; location: number; category: number };
  }>;
}

export interface ImageAnalysisResult {
  metadata: {
    hasMetadata: boolean;
    gps: { latitude: number; longitude: number } | null;
    timestamp: string | null;
    device: { make: string; model: string } | null;
  };
  locationVerification: {
    canVerify: boolean;
    match?: boolean;
    distance?: number;
    trustLevel?: string;
    message: string;
  };
  timestampAssessment: {
    hasTimestamp: boolean;
    isRecent?: boolean;
    age?: string;
    trustLevel?: string;
    message: string;
  };
  overallTrust: string;
}

export interface DescriptionMatchResult {
  aiDescription: string | null;
  descriptionMatch: {
    canCompare: boolean;
    similarity?: number;
    matchLevel?: string;
    message: string;
    overlappingTerms?: string[];
  };
  categoryValidation: {
    canValidate: boolean;
    matches?: boolean;
    message: string;
  };
  overallMatch: string;
}

export interface FullAIAnalysis {
  duplicateDetection: DuplicateCheckResult | null;
  imageAnalysis: ImageAnalysisResult | null;
  descriptionMatch: DescriptionMatchResult | null;
  credibility: {
    score: number;
    level: string;
    factors: string[];
  };
}

export async function checkDuplicate(data: {
  description: string;
  title?: string;
  category: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}): Promise<DuplicateCheckResult> {
  const res = await api.post('/ai/check-duplicate', data);
  return res.data.data;
}

export async function analyzeImageMetadata(
  photo: File,
  latitude?: number,
  longitude?: number
): Promise<ImageAnalysisResult> {
  const formData = new FormData();
  formData.append('photo', photo);
  if (latitude != null) formData.append('latitude', String(latitude));
  if (longitude != null) formData.append('longitude', String(longitude));

  const res = await api.post('/ai/analyze-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function matchImageDescription(
  photo: File,
  description: string,
  category: string
): Promise<DescriptionMatchResult> {
  const formData = new FormData();
  formData.append('photo', photo);
  formData.append('description', description);
  formData.append('category', category);

  const res = await api.post('/ai/match-description', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function runFullAIAnalysis(
  photo: File | null,
  data: {
    description: string;
    title?: string;
    category: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }
): Promise<FullAIAnalysis> {
  const formData = new FormData();
  if (photo) formData.append('photo', photo);
  Object.entries(data).forEach(([key, value]) => {
    if (value != null) formData.append(key, String(value));
  });

  const res = await api.post('/ai/full-analysis', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export default api;
