import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter, Eye, Calendar } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  MapContainer, TileLayer, Marker, Popup, useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const defaultCenter: [number, number] = [28.635308, 77.22496];
const API_URL = import.meta.env.VITE_API_URL || "https://civic-sih-backend.onrender.com";

function SetMapView({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords[0], coords[1]]);
  return null;
}

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    setLoading(true);
    setFetchError("");
    fetch(`${API_URL}/api/reports`, { cache: "no-store"})
      .then(res => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Support both { success: true, data: [...] } and plain array
        const reports = Array.isArray(data) ? data
          : (data.success ? data.data : []);
        // Sort by descending date (newest first; assumes createdAt or date)
        setIssues(reports.sort((a, b) =>
  new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
));

      })
      .catch(err => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLocation(null)
      );
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "destructive";
      case "in-progress": return "default";
      case "resolved": return "secondary";
      default: return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "outline";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const filteredIssues = issues.filter((issue: any) => {
    if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && issue.status !== selectedStatus) return false;
    return true;
  });

  const mapCenter: [number, number] = userLocation ?? defaultCenter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary-light/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">City Issues Map</h1>
          <p className="text-lg text-muted-foreground">View all reported civic issues across the city</p>
        </div>

        <Card className="mb-6 shadow-civic">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="min-w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Roads & Infrastructure">Roads & Infrastructure</SelectItem>
                    <SelectItem value="Streetlights">Streetlights</SelectItem>
                    <SelectItem value="Sanitation & Waste">Sanitation & Waste</SelectItem>
                    <SelectItem value="Water & Utilities">Water & Utilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-48">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* OpenStreetMap */}
          <Card className="shadow-civic-strong">
            <CardHeader>
              <CardTitle>Interactive Map (OpenStreetMap)</CardTitle>
              <CardDescription>
                Click on markers to view issue details. Your live location is highlighted (blue marker).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden" style={{ height: "400px" }}>
                <MapContainer center={mapCenter} zoom={14} style={{ width: "100%", height: "400px" }} scrollWheelZoom={true}>
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <SetMapView coords={mapCenter} />
                  {userLocation && (
                    <Marker position={userLocation} icon={L.icon({
                      iconUrl: "https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=U|2869e6|ffffff",
                      iconSize: [21, 34], iconAnchor: [10, 34]
                    })}>
                      <Popup><span>Your Location</span></Popup>
                    </Marker>
                  )}
                  {filteredIssues.map((issue: any) => {
                    // GeoJSON fallback (preferred)
                    if (issue.location?.coordinates) {
                      return (
                        <Marker
                          position={[
                            issue.location.coordinates[1], // latitude
                            issue.location.coordinates[0], // longitude
                          ]}
                          key={issue._id || issue.id}
                        >
                          <Popup>
                            <b>{issue.category}</b><br />
                            {issue.description}<br />
                            <span className="text-xs">{issue.address}</span>
                          </Popup>
                        </Marker>
                      );
                    }
                    // "lat,lng" string fallback (legacy/edge case)
                    if (issue.address && issue.address.includes(',')) {
                      const [lat, lng] = issue.address.split(',').map((s: string) => parseFloat(s.trim()));
                      if (!isNaN(lat) && !isNaN(lng)) {
                        return (
                          <Marker
                            position={[lat, lng]}
                            key={issue._id || issue.id}
                          >
                            <Popup>
                              <b>{issue.category}</b><br />
                              {issue.description}<br />
                              <span className="text-xs">{issue.address}</span>
                            </Popup>
                          </Marker>
                        );
                      }
                    }
                    return null;
                  })}
                </MapContainer>
                {loading && <div className="pt-2 text-primary">Loading reports...</div>}
                {fetchError && <div className="pt-2 text-red-500">Fetch Error: {fetchError}</div>}
                {!loading && !fetchError && filteredIssues.length === 0 && (
                  <div className="pt-2 text-muted-foreground">No reports found.</div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* List */}
          <Card className="shadow-civic-strong">
            <CardHeader>
              <CardTitle>Recent Issues</CardTitle>
              <CardDescription>{filteredIssues.length} issues found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredIssues.map((issue: any) => (
                  <div key={issue._id || issue.id} className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-light to-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                            <Badge variant={getStatusColor(issue.status)}>{issue.status}</Badge>
                            <Badge variant={getPriorityColor(issue.priority)}>{issue.priority}</Badge>
                          </div>
                          <Eye className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-foreground">{issue.category}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {issue.address}
                        </p>
                        <p className="text-sm text-foreground mb-2">{issue.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {issue.date || issue.createdAt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && <div className="pt-2 text-primary">Loading issues...</div>}
                {fetchError && <div className="pt-2 text-red-500">Fetch Error: {fetchError}</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
