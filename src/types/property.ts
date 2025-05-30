export interface Location {
  address: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PropertyFeature {
  name: string;
  value: string | boolean;
  icon?: string;
}

export type PropertyStatus = 'pending' | 'approved' | 'rejected';
export type PropertyCategory = 'rent' | 'sale';
export type PropertyType = 'apartment' | 'villa' | 'office' | 'land' | 'commercial';

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  videos?: string[];
  location: Location;
  type: PropertyType;
  category: PropertyCategory;
  features: PropertyFeature[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  sellerId: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
  views: number;
  favorites: number;
  inquiries: number;
}

export interface PropertyFilter {
  category?: PropertyCategory;
  type?: PropertyType;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  bedroomsMin?: number;
  bathroomsMin?: number;
  areaMin?: number;
  areaMax?: number;
  features?: string[];
}