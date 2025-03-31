
import React, { useEffect, useRef } from 'react';
import { useRide } from '@/lib/context/RideContext';
import { Clock } from 'lucide-react';

declare global {
  interface Window {
    initMap?: () => void;
    google?: any;
  }
}

const RideMap: React.FC = () => {
  const { 
    currentRide, 
    rideTimer, 
    isRideTimerActive,
    pickupLocation,
    dropoffLocation
  } = useRide();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Format timer as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Initialize map
    const initMap = () => {
      if (!mapRef.current || !window.google) return;

      // Default center (can be adjusted)
      const center = { lat: 40.7484, lng: -73.9857 };
      
      // Create map instance
      const mapOptions: google.maps.MapOptions = {
        center,
        zoom: 13,
        disableDefaultUI: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      
      // Initialize directions renderer
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#FFD700',
          strokeWeight: 5
        }
      });
    };

    // Load Google Maps script
    if (!window.google) {
      window.initMap = initMap;
      const script = document.createElement('script');
      script.src = `https://maps.gomaps.pro/maps/api/js?key=${process.env.VITE_MAPS_API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      return () => {
        // Clean up script if component unmounts before script loads
        window.initMap = undefined;
        document.head.removeChild(script);
      };
    } else {
      initMap();
    }
  }, []);

  useEffect(() => {
    // Update map when pickup or dropoff location changes
    const updateMapWithLocations = () => {
      if (!mapInstanceRef.current || !window.google) return;
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      // Add pickup marker if coordinates exist
      if (pickupLocation?.coordinates) {
        const pickupLatLng = {
          lat: pickupLocation.coordinates[1],
          lng: pickupLocation.coordinates[0]
        };
        
        const pickupMarker = new window.google.maps.Marker({
          position: pickupLatLng,
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#000000',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          },
          title: 'Pickup'
        });
        
        markersRef.current.push(pickupMarker);
        
        // Center map on pickup location if no dropoff
        if (!dropoffLocation?.coordinates) {
          mapInstanceRef.current.setCenter(pickupLatLng);
          mapInstanceRef.current.setZoom(15);
        }
      }
      
      // Add dropoff marker if coordinates exist
      if (dropoffLocation?.coordinates) {
        const dropoffLatLng = {
          lat: dropoffLocation.coordinates[1],
          lng: dropoffLocation.coordinates[0]
        };
        
        const dropoffMarker = new window.google.maps.Marker({
          position: dropoffLatLng,
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#FF0000',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          },
          title: 'Dropoff'
        });
        
        markersRef.current.push(dropoffMarker);
      }
      
      // Draw route if both pickup and dropoff exist
      if (pickupLocation?.coordinates && dropoffLocation?.coordinates && directionsRendererRef.current) {
        const directionsService = new window.google.maps.DirectionsService();
        
        directionsService.route({
          origin: {
            lat: pickupLocation.coordinates[1],
            lng: pickupLocation.coordinates[0]
          },
          destination: {
            lat: dropoffLocation.coordinates[1],
            lng: dropoffLocation.coordinates[0]
          },
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
            
            // Fit bounds to show entire route
            if (mapInstanceRef.current && result?.routes?.[0]?.bounds) {
              mapInstanceRef.current.fitBounds(result.routes[0].bounds);
              
              // Add a bit of padding
              const bounds = mapInstanceRef.current.getBounds();
              if (bounds) {
                mapInstanceRef.current.fitBounds(bounds, 50); // 50px padding
              }
            }
          }
        });
      }
    };
    
    updateMapWithLocations();
  }, [pickupLocation?.coordinates, dropoffLocation?.coordinates]);

  // Handle ride status changes and show car marker
  useEffect(() => {
    const updateRideOnMap = () => {
      if (!currentRide || !mapInstanceRef.current || !window.google) return;
      
      if (currentRide.status === 'in_progress' && currentRide.pickup.coordinates) {
        // Show a car marker for the driver during ride
        const carMarker = new window.google.maps.Marker({
          position: {
            lat: currentRide.pickup.coordinates[1],
            lng: currentRide.pickup.coordinates[0]
          },
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#FFD700',
            fillOpacity: 1,
            strokeColor: '#000000',
            strokeWeight: 1,
            rotation: 45 // Adjust rotation as needed
          },
          title: 'Driver'
        });
        
        markersRef.current.push(carMarker);
        
        // Animate car movement (simplified version)
        if (currentRide.pickup.coordinates && currentRide.dropoff.coordinates) {
          const startLat = currentRide.pickup.coordinates[1];
          const startLng = currentRide.pickup.coordinates[0];
          const endLat = currentRide.dropoff.coordinates[1];
          const endLng = currentRide.dropoff.coordinates[0];
          
          let step = 0;
          const numSteps = 200; // Adjust for faster/slower animation
          const animationDelay = 300; // ms
          
          const animate = () => {
            if (step >= numSteps) return;
            
            step++;
            const fraction = step / numSteps;
            
            const lat = startLat + (endLat - startLat) * fraction;
            const lng = startLng + (endLng - startLng) * fraction;
            
            carMarker.setPosition({ lat, lng });
            
            setTimeout(animate, animationDelay);
          };
          
          animate();
        }
      }
    };
    
    updateRideOnMap();
  }, [currentRide?.status]);

  return (
    <div className="relative w-full h-[60vh] bg-gray-100">
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Timer overlay */}
      {isRideTimerActive && (
        <div className="absolute bottom-[15%] left-1/2 transform -translate-x-1/2 rounded-full bg-black text-white px-6 py-2 flex items-center gap-2 z-10">
          <Clock size={18} />
          <span className="text-lg font-medium">{formatTime(rideTimer)}</span>
        </div>
      )}
    </div>
  );
};

export default RideMap;
