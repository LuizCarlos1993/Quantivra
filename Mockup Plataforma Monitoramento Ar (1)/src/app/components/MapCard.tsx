import { MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface MapCardProps {
  mapImageUrl: string;
  stationName: string;
}

export function MapCard({ mapImageUrl, stationName }: MapCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 h-full">
      <h3 className="text-xs font-semibold text-[#2C5F6F] mb-2">Localização</h3>
      <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden mb-2">
        <ImageWithFallback
          src={mapImageUrl}
          alt="Mapa de localização"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <MapPin className="size-6 text-red-500 drop-shadow-lg" fill="currentColor" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full animate-ping" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-600 text-center">{stationName}</p>
    </div>
  );
}
