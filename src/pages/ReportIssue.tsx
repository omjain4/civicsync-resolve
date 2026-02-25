import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPin, Upload, Loader2, Camera, ChevronLeft, ChevronRight, Mic, Sparkles, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { suggestIssueDescription } from "@/ai/suggest-issue-description";
import { cn } from "@/lib/utils";

const issueCategories = [
  "Roads & Potholes",
  "Water & Utilities",
  "Sanitation & Waste",
  "Streetlights & Power",
  "Pan Masala Spitting & Stains",
  "Littering & Garbage Dumping",
  "Illegal Parking",
  "Noise Pollution",
  "Parks & Public Spaces",
  "Public Safety",
  "Drainage & Sewerage",
  "Illegal Construction",
  "Encroachment on Footpaths",
  "Other"
];

const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const results = await response.json();
  if (results && results.length > 0) {
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  }
  return null;
};

const isValidDataURL = (dataURL: string): boolean => {
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(dataURL);
};

const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1200, maxHeight = 1200;
      let { width, height } = img;
      if (width > height && width > maxWidth) {
        height = (height * maxWidth) / width; width = maxWidth;
      }
      if (height > width && height > maxHeight) {
        width = (width * maxHeight) / height; height = maxHeight;
      }
      canvas.width = width; canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type, lastModified: Date.now(),
          });
          resolve(compressedFile);
        }
      }, file.type, quality);
    };
    img.src = URL.createObjectURL(file);
  });
};

const createIssue = async (formData: FormData) => {
  const { data } = await api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export default function ReportIssue() {
  const [currentStep, setCurrentStep] = useState(1);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch all reports for duplicate detection
  const { data: allReports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await api.get("/reports")).data.data,
  });

  // Compute nearby duplicates based on category + location
  const nearbyDuplicates = useMemo(() => {
    if (!allReports || !category || !location) return [];
    return allReports.filter((r: any) => {
      if (r.category !== category || !r.location?.coordinates) return false;
      const [rLng, rLat] = r.location.coordinates;
      const dist = Math.sqrt((rLng - location.lng) ** 2 + (rLat - location.lat) ** 2);
      return dist < 0.005; // ~500m
    });
  }, [allReports, category, location]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
        toast({ title: "Voice captured!", description: "Your speech has been converted to text." });
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
        toast({ title: "Voice recognition failed", description: "Please try again or type manually.", variant: "destructive" });
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [toast]);

  const startVoiceRecognition = () => {
    if (recognition) {
      setIsListening(true);
      recognition.start();
    } else {
      toast({ title: "Voice recognition not supported", description: "Please use a modern browser.", variant: "destructive" });
    }
  };

  const stopVoiceRecognition = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognition && isListening) {
        recognition.stop();
      }
    };
  }, [stream, recognition, isListening]);

  const mutation = useMutation({
    mutationFn: createIssue,
    onSuccess: () => {
      toast({ title: "Issue Reported Successfully!", description: "Your report has been submitted to the authorities." });
      queryClient.invalidateQueries({ queryKey: ['myIssues'] });
      navigate('/my-issues');
    },
    onError: (error: any) => {
      toast({ title: "Submission Failed", description: error.response?.data?.message || "Could not submit your report.", variant: "destructive" });
    },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(file, 0.7);
        setPhoto(compressedFile);
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(compressedFile);
        toast({ title: "Photo Added", description: `Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB` });
      } catch (error) {
        setPhoto(file);
        toast({ title: "Compression Failed", description: "Using original image.", variant: "destructive" });
      } finally { setIsCompressing(false); }
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const openCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      toast({ title: "Camera Access Denied", description: "Please allow camera access to take photos.", variant: "destructive" });
    }
  }, [toast]);

  const takePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          setPhoto(file);
          setPhotoPreview(canvas.toDataURL('image/jpeg'));
          closeCamera();
          toast({ title: "Photo Captured!", description: "Your photo has been added to the report." });
        }
      }, 'image/jpeg', 0.8);
    }
  }, [toast]);

  const closeCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setStream(null);
    setShowCamera(false);
  }, [stream]);

  const generateAIDescription = useCallback(async () => {
    if (!photoPreview || !address) {
      toast({ title: "Missing Information", description: "Please add a photo and location first.", variant: "destructive" });
      return;
    }
    setIsGeneratingAI(true);
    try {
      const result = await suggestIssueDescription({ photoDataUri: photoPreview, locationData: address });
      setAiDescription(result.suggestedDescription);
      toast({ title: "AI Description Generated!", description: "You can edit or use this description." });
    } catch (error) {
      toast({ title: "AI Generation Failed", description: "Could not generate description. Please write manually.", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [photoPreview, address, toast]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation Not Supported", description: "Your browser doesn't support location services.", variant: "destructive" });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast({ title: "Location Acquired!", description: "Your current location has been captured." });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Failed to get your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED: errorMessage = "Location access denied."; break;
          case error.POSITION_UNAVAILABLE: errorMessage = "Location information unavailable."; break;
          case error.TIMEOUT: errorMessage = "Location request timed out."; break;
        }
        toast({ title: "Location Error", description: errorMessage, variant: "destructive" });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = () => {
    if (!category || !address || !description) {
      return toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
    }
    if (!agreed) {
      return toast({ title: "Declaration Required", description: "You must agree that all details are true.", variant: "destructive" });
    }
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('title', category);
    formData.append('category', category);
    formData.append('address', address);
    formData.append('description', description);
    formData.append('severity', severity.toString());
    if (photo) { formData.append('photo', photo); setUploadProgress(50); }
    if (location) {
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
    }
    setUploadProgress(80);
    mutation.mutate(formData);
  };

  const nextStep = () => { if (currentStep < 4) setCurrentStep(currentStep + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const getSeverityLabel = (value: number) => {
    switch (value) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'Medium priority';
      case 4: return 'High';
      case 5: return 'Critical';
      default: return 'Medium';
    }
  };

  const getExpectedTime = () => {
    const days = severity <= 2 ? '7-14' : severity <= 3 ? '3-7' : severity <= 4 ? '1-3' : '24 hours';
    return days;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest mb-1">Issue Details</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Select category, upload photo, and set location</p>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2 block">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border focus:ring-2 focus:ring-[#D52E25]/20">
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {issueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Photo / Video</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                {photoPreview ? (
                  <div className="space-y-3 relative">
                    {photo?.type.startsWith("video") ? (
                      <video src={photoPreview} controls className="max-w-full h-48 object-cover rounded mx-auto" />
                    ) : (
                      <img src={photoPreview && isValidDataURL(photoPreview) ? photoPreview : ''} alt="Preview" className="max-w-full h-48 object-cover rounded mx-auto" />
                    )}
                    <button type="button" className="absolute top-2 right-2 text-red-600 bg-white rounded-md px-2 py-1 text-sm shadow-sm border" onClick={clearPhoto}>
                      Remove
                    </button>
                    <p className="text-sm text-gray-500">{photo && `${(photo.size / 1024 / 1024).toFixed(2)}MB`}</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center py-2">
                    <Camera className="w-10 h-10 text-gray-400" />
                    <p className="text-sm text-gray-600">Drag & drop a file or</p>
                    <div className="flex items-center gap-3">
                      <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>
                        Upload File
                      </Button>
                      <span className="text-gray-400 text-sm">or</span>
                      <Button type="button" size="sm" variant="outline" onClick={openCamera} disabled={isCompressing}>
                        Use Camera
                      </Button>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} accept="image/*,video/*" onChange={handlePhotoChange} className="hidden" disabled={isCompressing} />
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" disabled={isCompressing} />
                {isCompressing && (
                  <div className="flex justify-center mt-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />Compressing...
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="text-gray-700 font-medium mb-2 block">Location *</Label>
              <div className="flex gap-2">
                <Input id="location" placeholder="Enter address or use GPS" value={address} onChange={e => setAddress(e.target.value)} className="flex-1" />
                <Button type="button" size="icon" variant="outline" onClick={handleGetLocation} disabled={isGettingLocation}>
                  {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={async () => {
                  const coords = await geocodeAddress(address);
                  if (coords) {
                    setLocation(coords);
                    toast({ title: "Address Located!", description: `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}` });
                  } else {
                    toast({ title: "Address Not Found", variant: "destructive" });
                  }
                }} disabled={!address}>
                  Lookup
                </Button>
              </div>
            </div>

            {/* Duplicate detection banner */}
            {nearbyDuplicates.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3 rounded-md">
                <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-1">Similar Issue Detected</p>
                  <p className="text-xs text-amber-700">
                    There {nearbyDuplicates.length === 1 ? 'is' : 'are'} already <strong>{nearbyDuplicates.length} similar {nearbyDuplicates.length === 1 ? 'report' : 'reports'}</strong> in this area.
                    Your complaint will be registered collaboratively to help prioritize resolution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest mb-1">Categorization</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Set severity level for your issue</p>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Selected Category</Label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 font-medium text-gray-800">
                {category || "No category selected"}
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-3 block">Issue Severity (1-5)</Label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <Slider value={[severity]} onValueChange={value => setSeverity(value[0])} max={5} min={1} step={1} className="w-full mb-3" />
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Low</span><span>Medium</span><span>High</span><span>Urgent</span><span>Critical</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">Level {severity} — {getSeverityLabel(severity)}</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-semibold text-sm text-blue-900 mb-1">Expected Resolution Time</h3>
              <p className="text-sm text-blue-700">Based on severity: <span className="font-semibold">{getExpectedTime()}</span></p>
            </div>
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest mb-1">Description</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Describe the issue in detail</p>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                <Label className="text-gray-700 font-medium">Detailed Description *</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={generateAIDescription} disabled={isGeneratingAI || !photoPreview || !address}>
                    {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    AI Generate
                  </Button>
                  <Button size="sm" variant={isListening ? "destructive" : "outline"} onClick={isListening ? stopVoiceRecognition : startVoiceRecognition} disabled={!recognition}>
                    <Mic className="w-4 h-4 mr-1" />
                    {isListening ? "Stop" : "Voice"}
                  </Button>
                  <Select defaultValue="English">
                    <SelectTrigger className="w-24 text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {aiDescription && (
                <div className="mb-4 bg-purple-50 border border-purple-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Label className="text-purple-700 font-medium text-sm">AI Generated Description</Label>
                    <Button size="sm" onClick={() => setDescription(aiDescription)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                      Use This
                    </Button>
                  </div>
                  <p className="text-sm text-purple-800 bg-white rounded-md p-3 border border-purple-100">{aiDescription}</p>
                </div>
              )}

              <Textarea
                placeholder="Describe the issue in detail... What happened? When did you notice it?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
                className="resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-1">{description.length}/1000 characters</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Tips for better reports:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Include specific location details</li>
                <li>• Mention when the issue started</li>
                <li>• Describe how it affects daily life</li>
                <li>• Add any relevant context</li>
              </ul>
            </div>
          </div>
        </div>
      );

      case 4: return (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest mb-1">Review & Submit</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Please review your report before submitting</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-5 space-y-3 text-sm text-gray-700">
            <div><span className="font-medium text-gray-900">Category:</span> {category}</div>
            <div><span className="font-medium text-gray-900">Severity:</span> Level {severity} — {getSeverityLabel(severity)}</div>
            <div><span className="font-medium text-gray-900">Location:</span> {address}</div>
            <div><span className="font-medium text-gray-900">Description:</span> {description.substring(0, 100) + (description.length > 100 ? "..." : "")}</div>
            {photoPreview && (
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">Photo:</span>
                <img src={photoPreview && isValidDataURL(photoPreview) ? photoPreview : ''} alt="Preview" className="w-16 h-16 object-cover rounded border" />
              </div>
            )}
          </div>
          <div className="flex items-start gap-3 border border-gray-200 rounded-md p-4 bg-white">
            <Checkbox id="agree" checked={agreed} onCheckedChange={checked => setAgreed(Boolean(checked))} className="mt-1" />
            <Label htmlFor="agree" className="text-gray-700 text-sm leading-relaxed">
              I agree to the <a className="text-primary hover:underline font-medium" href="/terms" target="_blank" rel="noopener noreferrer">terms and conditions</a> and confirm that all information is true to the best of my knowledge.
            </Label>
          </div>
          {mutation.isPending && (
            <div className="border border-gray-200 rounded-md p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-gray-700 font-medium text-sm">Uploading report...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background animate-page-in">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="section-label mb-2">File a Report</p>
            <h1 className="display-md mb-2">Report an Issue</h1>
            <p className="text-xs uppercase tracking-wider text-gray-400">Help improve your city — report civic problems in just 30 seconds</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="font-semibold text-xs uppercase tracking-widest text-gray-700">Step {currentStep} of 4</span>
              <span className="font-medium text-xs uppercase tracking-widest text-gray-400">{Math.round((currentStep / 4) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#D52E25] h-2.5 transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
            {/* Step indicators */}
            <div className="flex justify-between mt-3">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    currentStep >= step ? "bg-[#1C1C1C] text-white" : "bg-gray-200 text-gray-500"
                  )}>
                    {step}
                  </div>
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {step === 1 ? "Details" : step === 2 ? "Category" : step === 3 ? "Describe" : "Review"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="ed-card p-6 md:p-8">
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between pt-8 border-t border-gray-200 mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || mutation.isPending}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              {currentStep === 4 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending || !agreed}
                  className="flex items-center gap-2 font-semibold"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={currentStep === 1 && !category}
                  className="flex items-center gap-2 font-semibold"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-md max-h-96 rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button onClick={takePhoto} className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16 text-2xl shadow-lg">
                📷
              </button>
              <button onClick={closeCamera} className="bg-red-600 text-white hover:bg-red-700 px-5 py-2 rounded-md font-medium shadow-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
