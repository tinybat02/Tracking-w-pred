import { Vector as VectorData } from '@grafana/data';

export interface MapOptions {
  center_lat: number;
  center_lon: number;
  tile_url: string;
  zoom_level: number;
}

export const defaults: MapOptions = {
  center_lat: 48.262725,
  center_lon: 11.66725,
  tile_url: '',
  zoom_level: 18,
};

export interface Record {
  latitude: number;
  longitude: number;
  latitude_pred: number;
  longitude_pred: number;
  timestamp: number;
}

export interface Buffer extends VectorData {
  buffer: Record[];
}
