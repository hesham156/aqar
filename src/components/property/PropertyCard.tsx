import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Home, 
  Heart, 
  TagIcon, 
  Share2 
} from 'lucide-react';
import { Property } from '../../types/property';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';

interface PropertyCardProps {
  property: Property;
  onFavoriteToggle?: (propertyId: string, isFavorited: boolean) => void;
}

const PropertyCard = ({ property, onFavoriteToggle }: PropertyCardProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check if property is favorited when component mounts
  useState(() => {
    const checkIfFavorited = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const favorites = userData.favorites || [];
          setIsFavorite(favorites.includes(property.id));
        }
      } catch (error) {
        console.error('Error checking favorites status:', error);
      }
    };

    checkIfFavorited();
  });

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info('Please log in to save properties to favorites');
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);
      const userRef = doc(db, 'users', user.uid);
      
      if (isFavorite) {
        // Remove from favorites
        await updateDoc(userRef, {
          favorites: arrayRemove(property.id)
        });
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await updateDoc(userRef, {
          favorites: arrayUnion(property.id)
        });
        setIsFavorite(true);
        toast.success('Added to favorites');
      }

      // Call the callback if provided
      if (onFavoriteToggle) {
        onFavoriteToggle(property.id, !isFavorite);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden">
      {/* Property Image */}
      <div className="relative">
        <Link to={`/properties/${property.id}`}>
          <img 
            src={property.images[0]} 
            alt={property.title} 
            className="w-full h-56 object-cover"
          />
        </Link>
        
        {/* Property Category Tag */}
        <div className="absolute top-4 left-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium 
            ${property.category === 'rent' 
              ? 'bg-accent-600 text-white' 
              : 'bg-secondary-600 text-white'}`}
          >
            {property.category === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
        </div>
        
        {/* Favorite Button */}
        <button
          className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-70 hover:bg-opacity-100 transition-colors"
          onClick={handleFavoriteToggle}
          disabled={isLoading}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart 
            className={`h-5 w-5 ${isFavorite ? 'fill-error-500 text-error-500' : 'text-gray-600'}`} 
          />
        </button>
      </div>
      
      {/* Property Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors">
              <Link to={`/properties/${property.id}`}>{property.title}</Link>
            </h3>
            <div className="flex items-center mt-1 text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{property.location.city}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary-600">
              {property.price.toLocaleString('en-SA')} SAR
            </p>
            {property.category === 'rent' && (
              <p className="text-xs text-gray-500">per month</p>
            )}
          </div>
        </div>
        
        {/* Property Features */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          {property.bedrooms !== undefined && (
            <div className="flex items-center">
              <Bed className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{property.bedrooms} Beds</span>
            </div>
          )}
          
          {property.bathrooms !== undefined && (
            <div className="flex items-center">
              <Bath className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{property.bathrooms} Baths</span>
            </div>
          )}
          
          {property.area !== undefined && (
            <div className="flex items-center">
              <Home className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{property.area} m²</span>
            </div>
          )}
        </div>
        
        {/* Property Type Tag */}
        <div className="mt-4 flex items-center">
          <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-xs text-gray-500 capitalize">{property.type}</span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;