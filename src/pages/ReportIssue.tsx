import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapPin, Upload, Loader2, Camera, ChevronLeft, ChevronRight, Mic, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
// Geocoding function for address search
const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const results = await response.json();
  if (results && results.length > 0) {
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  }
  return null;
};

// Validate data URL to prevent XSS
const isValidDataURL = (dataURL: string): boolean => {
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(dataURL);
};

// Image compression function
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
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
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

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
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

  // Cleanup camera and speech recognition on component unmount
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
      toast({
        title: "Issue Reported Successfully! ✅",
        description: "Your report has been submitted to the authorities.",
      });
      queryClient.invalidateQueries({ queryKey: ['myIssues'] });
      navigate('/my-issues');
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed ❌",
        description: error.response?.data?.message || "Could not submit your report.",
        variant: "destructive",
      });
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
        toast({
          title: "Photo Compressed & Added ✅",
          description: `File size reduced to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
        });
      } catch (error) {
        setPhoto(file);
        toast({
          title: "Compression Failed",
          description: "Using original image.",
          variant: "destructive"
        });
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
        video: { facingMode: 'environment' } // Use back camera
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to take photos.",
        variant: "destructive"
      });
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
          toast({
            title: "Photo Captured! 📸",
            description: "Your photo has been added to the report."
          });
        }
      }, 'image/jpeg', 0.8);
    }
  }, [toast]);

  const closeCamera = useCallback(() => {
    // Stop all tracks immediately
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force reload to clear any cached stream
    }
    
    // Clear state
    setStream(null);
    setShowCamera(false);
    
    // Force garbage collection of media stream
    setTimeout(() => {
      if (window.gc) {
        window.gc();
      }
    }, 100);
  }, [stream]);

  const generateAIDescription = useCallback(async () => {
    if (!photoPreview || !address) {
      toast({
        title: "Missing Information",
        description: "Please add a photo and location first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await suggestIssueDescription({
        photoDataUri: photoPreview,
        locationData: address
      });
      setAiDescription(result.suggestedDescription);
      toast({
        title: "AI Description Generated! ✨",
        description: "You can edit or use this description."
      });
    } catch (error) {
      toast({
        title: "AI Generation Failed",
        description: "Could not generate description. Please write manually.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [photoPreview, address, toast]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast({
          title: "Location Acquired! 📍",
          description: "Your current location has been captured.",
        });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Failed to get your location.";
        switch(error.code) {
          case error.PERMISSION_DENIED: errorMessage = "Location access denied. Please enable location services."; break;
          case error.POSITION_UNAVAILABLE: errorMessage = "Location information unavailable."; break;
          case error.TIMEOUT: errorMessage = "Location request timed out."; break;
        }
        toast({
          title: "Location Error ❌",
          description: errorMessage,
          variant: "destructive"
        });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = () => {
    if (!category || !address || !description) {
      return toast({
        title: "Missing Information",
        description: "Please fill out all required fields.",
        variant: "destructive"
      });
    }
    if (!agreed) {
      return toast({
        title: "Please agree to the declaration",
        description: "You must agree that all details are true and accept the terms.",
        variant: "destructive"
      });
    }
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('title', category);
    formData.append('category', category);
    formData.append('address', address);
    formData.append('description', description);
    formData.append('severity', severity.toString());
    if (photo) {
      formData.append('photo', photo);
      setUploadProgress(50);
    }
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
    switch(value) {
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
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Issue Details</h2>
            <p className="text-slate-600">Select category, upload photo, and set location</p>
          </div>
          <div className="space-y-5">
            <div className="animate-slide-up">
              <Label className="text-slate-700 font-medium mb-2 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="glass-input border-0 focus:ring-0">
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {issueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="animate-slide-up">
              <Label className="text-slate-700 font-medium mb-2 block">Photo/Video</Label>
              <div className="glass rounded-2xl p-8 text-center relative transition-all duration-300 hover:bg-white/80">
      {photoPreview ? (
        <div className="space-y-3 relative">
          {photo?.type.startsWith("video") ? (
            <video
              src={photoPreview}
              controls
              className="max-w-full h-48 object-cover rounded mx-auto"
            />
          ) : (
            <img
              src={photoPreview && isValidDataURL(photoPreview) ? photoPreview : ''}
              alt="Preview"
              className="max-w-full h-48 object-cover rounded mx-auto"
            />
          )}
          <button
            type="button"
            className="absolute top-2 right-2 text-blue-600 bg-white rounded px-1 shadow"
            onClick={clearPhoto}
          >
            Remove
          </button>
          <p className="text-sm">
            {photo && `${(photo.size / 1024 / 1024).toFixed(2)}MB`}
          </p>
        </div>
      ) : (
        // 👇 UPDATED SECTION for upload options
        <div className="space-y-4 flex flex-col items-center animate-float">
          <Camera className="w-12 h-12 text-blue-400" />
          <p className="text-base font-medium text-slate-700">
            Drag & drop a file or
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="glass-button bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50"
            >
              Upload File
            </button>
            <span className="text-slate-400">or</span>
            <button
              type="button"
              onClick={openCamera}
              disabled={isCompressing}
              className="glass-button text-slate-700 disabled:opacity-50"
            >
              Use Camera
            </button>
          </div>
        </div>
      )}

      {/* Hidden input for file selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        onChange={handlePhotoChange}
        className="hidden"
        disabled={isCompressing}
      />

      {/* Hidden input for camera capture */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment" // "user" for front camera
        onChange={handlePhotoChange}
        className="hidden"
        disabled={isCompressing}
      />

      {isCompressing && (
        <div className="flex justify-center mt-2">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>Compressing...</span>
        </div>
      )}
    </div>
  </div>

            </div>
            <div className="animate-slide-up">
              <Label htmlFor="location" className="text-slate-700 font-medium mb-2 block">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  placeholder="Enter address or use GPS"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="glass-input border-0 flex-1"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="glass-button bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50 px-3"
                >
                  {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const coords = await geocodeAddress(address);
                    if (coords) {
                      setLocation(coords);
                      toast({
                        title: "Address Located! 📍",
                        description: `Latitude: ${coords.lat}, Longitude: ${coords.lng}`,
                      });
                    } else {
                      toast({
                        title: "Address Not Found",
                        description: "No coordinates found for this address.",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!address}
                  className="glass-button text-slate-700 disabled:opacity-50 px-3 text-sm"
                >
                  Lookup
                </button>
              </div>
            </div>

          </div>
      );
      case 2: return (
        <div className="space-y-6">
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Categorization</h2>
            <p className="text-slate-600">AI will suggest the best category</p>
          </div>
          <div className="space-y-5">
            <div className="animate-slide-up">
              <Label className="text-slate-700 font-medium mb-2 block">Selected Category</Label>
              <div className="glass rounded-xl p-4 font-semibold text-slate-800">
                {category || "No category selected"}
              </div>
            </div>
            <div className="animate-slide-up">
              <Label className="text-slate-700 font-medium mb-3 block">Issue Severity (1-5)</Label>
              <div className="glass rounded-xl p-4">
                <Slider
                  value={[severity]}
                  onValueChange={value => setSeverity(value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full mb-3"
                />
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                  <span>Urgent</span>
                  <span>Critical</span>
                </div>
                <p className="text-sm text-slate-700 font-medium">Level {severity} - {getSeverityLabel(severity)}</p>
              </div>
            </div>
            <div className="glass rounded-xl p-4 animate-scale-in">
              <h3 className="font-semibold mb-1 text-slate-700">Expected Resolution Time</h3>
              <p className="text-sm text-slate-600">Based on category and severity: <span className="font-semibold text-blue-600">{getExpectedTime()}</span></p>
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-6">
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Description</h2>
            <p className="text-slate-600">Describe the issue in detail</p>
          </div>
          <div className="space-y-5">
            <div className="animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                <Label className="text-slate-700 font-medium">Detailed Description</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={generateAIDescription}
                    disabled={isGeneratingAI || !photoPreview || !address}
                    className="glass-button bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50 text-sm"
                  >
                    {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    AI Generate
                  </button>
                  <button 
                    onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                    disabled={!recognition}
                    className={cn(
                      "glass-button text-sm transition-all duration-500",
                      isListening ? "bg-red-500 text-white animate-pulse" : "text-slate-700 hover:bg-white/80"
                    )}
                  >
                    <Mic className={cn("w-4 h-4 mr-1 transition-all duration-300", isListening && "animate-bounce")} />
                    {isListening ? "Stop" : "Voice"}
                  </button>
                  <Select defaultValue="English">
                    <SelectTrigger className="glass-input w-24 text-sm border-0">
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
                <div className="mb-4 glass rounded-xl p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 animate-scale-in">
                  <div className="flex justify-between items-start mb-2">
                    <Label className="text-purple-700 font-medium">AI Generated Description</Label>
                    <button 
                      onClick={() => setDescription(aiDescription)}
                      className="glass-button bg-purple-500 text-white text-sm"
                    >
                      Use This
                    </button>
                  </div>
                  <p className="text-sm text-purple-800 glass rounded-lg p-3">{aiDescription}</p>
                </div>
              )}
              
              <Textarea
                placeholder="Describe the issue in detail... What happened? When did you notice it? How is it affecting you?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={6}
                className="glass-input resize-none border-0"
                maxLength={1000}
              />
              <p className="text-xs text-slate-500">{description.length}/1000 characters</p>
            </div>
            <div className="glass rounded-xl p-4 animate-scale-in">
              <h3 className="font-semibold text-slate-700 mb-2">Tips for better reports:</h3>
              <ul className="text-sm text-slate-600 space-y-1">
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
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Review & Submit</h2>
            <p className="text-slate-600">Please review your report before submitting</p>
          </div>
          <div className="glass rounded-xl p-5 space-y-3 text-slate-700 animate-scale-in">
            <div><span className="font-medium">Category:</span> {category}</div>
            <div><span className="font-medium">Severity:</span> Level {severity} - {getSeverityLabel(severity)}</div>
            <div><span className="font-medium">Location:</span> {address}</div>
            <div><span className="font-medium">Description:</span> {description.substring(0, 100) + (description.length > 100 ? "..." : "")}</div>
            {photoPreview && (
              <div className="flex items-center gap-3">
                <span className="font-medium">Photo:</span>
                <img src={photoPreview && isValidDataURL(photoPreview) ? photoPreview : ''} alt="Preview" className="w-16 h-16 object-cover rounded-lg shadow-md" />
              </div>
            )}
          </div>
          <div className="flex items-start gap-3 glass rounded-xl p-4 animate-slide-up">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={checked => setAgreed(Boolean(checked))}
              className="mt-1"
            />
            <Label htmlFor="agree" className="text-slate-700 text-sm leading-relaxed">
              I agree to the <a className="text-blue-600 hover:text-blue-800 underline" href="/terms" target="_blank" rel="noopener noreferrer">terms and conditions</a> and confirm that all information is true to the best of my knowledge.
            </Label>
          </div>
          {mutation.isPending && (
            <div className="glass rounded-xl p-4 animate-scale-in">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-slate-700 font-medium">Uploading report...</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                  style={{width: `${uploadProgress}%`}}
                ></div>
              </div>
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30"></div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-2xl mx-auto animate-fade-in">
          {/* Header */}
          <div className="text-center mb-10 animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Report an Issue
            </h1>
            <p className="text-xl text-blue-700 font-semibold">
              Help us improve your city – report civic problems in just 30 seconds
            </p>
          </div>
          {/* Progress Bar */}
          <div className="mb-10 animate-scale-in">
            <div className="flex justify-between items-center mb-4 text-blue-700">
              <span className="text-base font-semibold">Step {currentStep} of 4</span>
              <span className="text-base font-semibold">{Math.round((currentStep / 4) * 100)}% Complete</span>
            </div>
            <div className="w-full glass rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-700 ease-out shadow-xl" 
                style={{width: `${(currentStep / 4) * 100}%`}}
              ></div>
            </div>
          </div>
          {/* Step Content */}
          <div className="glass-card p-10 animate-scale-in shadow-2xl">
            <div className="">

              {renderStepContent()}
              {/* Navigation */}
              <div className="flex justify-between pt-10">
                <button 
                  onClick={prevStep} 
                  disabled={currentStep === 1 || mutation.isPending}
                  className="glass-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-slate-700 px-8 py-4 hover:scale-105 transition-all duration-500"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
                {currentStep === 4 ? (
                  <button 
                    onClick={handleSubmit}
                    disabled={mutation.isPending || !agreed}
                    className="glass-button bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50 flex items-center gap-3 shadow-2xl px-8 py-4 hover:scale-105 transition-all duration-500"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Submit Report
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={nextStep}
                    disabled={currentStep === 1 && !category}
                    className="glass-button bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50 flex items-center gap-3 shadow-2xl px-8 py-4 hover:scale-105 transition-all duration-500"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full h-full max-w-md max-h-96 rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={takePhoto}
                className="glass-button bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16 text-2xl shadow-2xl"
              >
                📷
              </button>
              <button
                onClick={closeCamera}
                className="glass-button bg-red-500/90 text-white hover:bg-red-600/90 px-4 py-2 shadow-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
