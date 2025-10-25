import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import api from '../lib/fetch';
import '../styles/IncidentMap.css';

// Custom marker icons for incidents
const createCustomIcon = (type) => {
    const color = '#ef4444'; // Red for all incidents
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 20px;
                height: 20px;
                background-color: ${color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: white;
                font-weight: bold;
            ">
                ${type.charAt(0).toUpperCase()}
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
};

// Component to set fractional zoom level
const FractionalZoomSetter = () => {
    const map = useMap();
    
    useEffect(() => {
        // Set zoom to 16.2 after map initializes, but respect bounds
        setTimeout(() => {
            map.setZoom(16.2, { animate: false });
        }, 100);
    }, [map]);
    
    return null;
};

// Component to handle map updates and pin management
const MapController = ({ incidents, onIncidentClick }) => {
    const map = useMap();
    const markersRef = useRef(new Map());
    
    // Update pins when incidents change
    useEffect(() => {
        const currentMarkers = markersRef.current;
        const mapInstance = map;
        
        // Remove all existing markers first
        currentMarkers.forEach((marker) => {
            mapInstance.removeLayer(marker);
        });
        currentMarkers.clear();
        
        // Add new markers for non-closed incidents
        incidents
            .filter(incident => incident.status !== 'closed')
            .forEach(incident => {
                const marker = L.marker([incident.latitude, incident.longitude], {
                    icon: createCustomIcon(incident.type)
                });
                
                // Direct click handler - no popup, navigate directly to details
                marker.on('click', (e) => {
                    e.originalEvent.stopPropagation();
                    
                    // Navigate to incident reports page
                    window.location.href = '/incident-reports';
                    
                    // Store the incident ID to open modal after page load
                    sessionStorage.setItem('openIncidentModal', incident.id);
                });
                
                marker.addTo(mapInstance);
                currentMarkers.set(incident.id, marker);
            });
        
        // Map bounds fitting removed to prevent refresh
        
    }, [incidents, map, onIncidentClick]);
    
    return null;
};

// Main IncidentMap component
const IncidentMap = ({ onIncidentClick, className = '' }) => {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const pollingIntervalRef = useRef(null);
    
    // Geo visualization state (copied from analytics.js)
    const [barangayGeoJson, setBarangayGeoJson] = useState(null);
    const [barangayBounds, setBarangayBounds] = useState(null);
    const [barangayCenter, setBarangayCenter] = useState([14.5995, 120.9842]);
    const [maxIncidentCount, setMaxIncidentCount] = useState(1);
    
    // Default center coordinates (Manila, Philippines)
    const defaultCenter = [14.5995, 120.9842];
    const defaultZoom = 13;
    
    // Fetch incidents from API (get incident reports from /api/requests) - following analytics.js pattern
    const fetchIncidents = useCallback(async () => {
        try {
            const response = await api.get('/api/requests');
            const allRequests = response.data || [];
            
            // Filter for incident reports only
            const incidentReports = allRequests.filter(request => request.type === 'Incident Report');
            
            // Use actual coordinates from the location column in incident_reports table
            const transformedIncidents = incidentReports.map((incident, index) => {
                // Parse coordinates from location column (format: "120.97596763962858,14.654532956550437")
                let lat, lng;
                
                if (incident.location && typeof incident.location === 'string') {
                    const coords = incident.location.split(',');
                    if (coords.length === 2) {
                        lng = parseFloat(coords[0].trim());
                        lat = parseFloat(coords[1].trim());
                    }
                }
                
                // Fallback to default coordinates if parsing fails
                if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                    console.warn(`Invalid coordinates for incident ${incident.id}: ${incident.location}`);
                    // Use center of the barangay area as fallback
                    lat = 14.6566; // Approximate center of new polygon
                    lng = 120.9758; // Approximate center of new polygon
                }

                return {
                    id: incident.id,
                    latitude: lat,
                    longitude: lng,
                    type: 'Incident',
                    status: incident.status || 'pending',
                    timestamp: incident.created_at,
                    title: incident.title,
                    description: incident.description,
                    location: incident.location,
                    requester_name: incident.requester_name,
                    requester_phone: incident.requester_phone
                };
            });
            
            setIncidents(transformedIncidents);
            setLastUpdate(new Date());
            setError(null);
            
            console.log(`🗺️ Loaded ${transformedIncidents.length} incident reports for map`);
        } catch (err) {
            console.error('Error fetching incident reports:', err);
            setError('Failed to fetch incident data');
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Fetch incidents with 30-second refresh
    useEffect(() => {
        // Initial fetch
        fetchIncidents();
        
        // Set up polling every 30 seconds for live updates
        pollingIntervalRef.current = setInterval(fetchIncidents, 30000);
        
        // Cleanup on unmount
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [fetchIncidents]);

    // Set up barangay GeoJSON and bounds (copied from analytics.js)
    useEffect(() => {
        // Set up the barangay polygon with the coordinates from analytics.js
        const sample = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { name: 'Sample Barangay A', incident_count: 4 },
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [120.9740121, 14.6575099],
                            [120.9749562, 14.6531815],
                            [120.9770162, 14.6535448],
                            [120.9780998, 14.6589319],
                            [120.9748597, 14.6584233],
                            [120.9740121, 14.6575099]
                        ]
                    }
                }
            ]
        };
        setBarangayGeoJson(sample);
        setMaxIncidentCount(4);

        // Compute map bounds from GeoJSON coordinates (supports LineString/Polygon)
        const toLatLngs = (gj) => {
            try {
                const arr = [];
                (gj.features || []).forEach(f => {
                    const g = f.geometry || {};
                    if (g.type === 'LineString') {
                        (g.coordinates || []).forEach(([lng, lat]) => arr.push([lat, lng]));
                    } else if (g.type === 'Polygon') {
                        (g.coordinates || []).flat().forEach(([lng, lat]) => arr.push([lat, lng]));
                    } else if (g.type === 'MultiPolygon') {
                        (g.coordinates || []).flat(2).forEach(([lng, lat]) => arr.push([lat, lng]));
                    }
                });
                return arr;
            } catch { return []; }
        };
        const pts = toLatLngs(sample);
        if (pts.length) {
            const lats = pts.map(p => p[0]);
            const lngs = pts.map(p => p[1]);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            // Smaller padding to zoom in closer while preserving full polygon
            const padLat = Math.max(0.00001, (maxLat - minLat) * 0.01);
            const padLng = Math.max(0.00001, (maxLng - minLng) * 0.01);
            const bounds = [[minLat - padLat, minLng - padLng], [maxLat + padLat, maxLng + padLng]];
            setBarangayBounds(bounds);
            // centroid (simple average sufficient for small area)
            const avgLat = (minLat + maxLat) / 2;
            const avgLng = (minLng + maxLng) / 2;
            setBarangayCenter([avgLat, avgLng]);
        }
    }, []);
    
    // Handle incident click
    const handleIncidentClick = useCallback((incident) => {
        if (onIncidentClick) {
            onIncidentClick(incident);
        }
    }, [onIncidentClick]);

    // GeoJSON styling function (copied from analytics.js)
    const getColorForCount = (count) => {
        // Color scale from low (light yellow) to high (red)
        const ratio = Math.min(1, Math.max(0, count / Math.max(1, maxIncidentCount)));
        // interpolate between #fde68a (low) -> #fb923c (mid) -> #ef4444 (high)
        const stops = [
            { r: 253, g: 230, b: 138 }, // #fde68a
            { r: 251, g: 146, b: 60 },  // #fb923c
            { r: 239, g: 68,  b: 68 }   // #ef4444
        ];
        const t = ratio * 2;
        const i = Math.floor(t);
        const frac = t - i;
        const a = stops[Math.min(i, stops.length - 1)];
        const b = stops[Math.min(i + 1, stops.length - 1)];
        const mix = (x, y) => Math.round(x + (y - x) * frac);
        return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
    };

    const geoJsonStyle = (feature) => {
        const c = feature?.properties?.incident_count || 0;
        return {
            color: '#fff',
            weight: 1,
            fillColor: getColorForCount(c),
            fillOpacity: 0.7,
        };
    };
    
    // Use fixed map configuration like analytics.js (no dynamic bounds)
    const mapConfig = {
        center: barangayCenter,
        zoom: 17,
        bounds: barangayBounds
    };
    
    if (loading) {
        return (
            <div className={`incident-map-container ${className}`}>
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading incident map...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className={`incident-map-container ${className}`}>
                <div className="map-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Map Error</h3>
                    <p>{error}</p>
                    <button onClick={fetchIncidents} className="btn-retry">
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    
    const activeIncidents = incidents.filter(incident => incident.status !== 'closed');
    
    return (
        <div className={`incident-map-container ${className}`}>
            <div className="map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Active Incident Map</h3>
                {lastUpdate && (
                    <div className="last-update">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </div>
                )}
            </div>
            
            <div className="map-wrapper">
                {barangayGeoJson && (
                    <MapContainer
                        center={barangayCenter}
                        zoom={16}
                        style={{ width: '100%', height: '100%' }}
                        bounds={barangayBounds || undefined}
                        boundsOptions={{ padding: [20, 20] }}
                        maxBounds={barangayBounds || undefined}
                        maxBoundsViscosity={1.0}
                        minZoom={15}
                        maxZoom={20}
                        dragging={true}
                        zoomControl={true}
                        scrollWheelZoom={true}
                        doubleClickZoom={true}
                        boxZoom={true}
                        keyboard={true}
                        touchZoom={true}
                    >
                        <FractionalZoomSetter />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <GeoJSON data={barangayGeoJson} style={geoJsonStyle} />
                        <MapController 
                            incidents={incidents} 
                            onIncidentClick={handleIncidentClick}
                        />
                    </MapContainer>
                )}
            </div>
            

        </div>
    );
};

export default IncidentMap;
