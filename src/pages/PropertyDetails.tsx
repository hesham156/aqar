import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Bed,
  Bath,
  Home,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types/property';
import { toast } from 'react-toastify';

const PropertyDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;

      try {
        const propertyDoc = await getDoc(doc(db, 'properties', id));
        if (propertyDoc.exists()) {
          const propertyData = {
            id: propertyDoc.id,
            ...propertyDoc.data()
          } as Property;
          setProperty(propertyData);

          // Update view count
          await updateDoc(doc(db, 'properties', id), {
            views: (propertyData.views || 0) + 1
          });

          // Check if property is favorited by current user
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsFavorite((userData.favorites || []).includes(id));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching property:', error);
        toast.error('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, user]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info('Please log in to save properties to favorites');
      return;
    }

    if (!property) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const propertyRef = doc(db, 'properties', property.id);

      if (isFavorite) {
        await updateDoc(userRef, {
          favorites: arrayRemove(property.id)
        });
        await updateDoc(propertyRef, {
          favorites: property.favorites - 1
        });
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(property.id)
        });
        await updateDoc(propertyRef, {
          favorites: property.favorites + 1
        });
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property) return;

    setSendingMessage(true);
    try {
      // Create inquiry
      await addDoc(collection(db, 'inquiries'), {
        propertyId: property.id,
        propertyTitle: property.title,
        buyerId: user.uid,
        buyerName: user.displayName,
        sellerId: property.sellerId,
        message,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update property inquiries count
      await updateDoc(doc(db, 'properties', property.id), {
        inquiries: property.inquiries + 1
      });

      toast.success('Message sent successfully');
      setMessage('');
      setShowContactForm(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
        <p className="text-gray-600 mb-8">The property you're looking for doesn't exist or has been removed.</p>
        <Link
          to="/"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Property Images Slider */}
      <div className="relative h-96 bg-gray-900">
        <img
          src={property.images[currentImageIndex]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        
        {property.images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-70 hover:bg-opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-6 w-6 text-gray-900" />
            </button>
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white bg-opacity-70 hover:bg-opacity-100 transition-opacity"
            >
              <ChevronRight className="h-6 w-6 text-gray-900" />
            </button>
          </>
        )}
        
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {property.images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
                  <div className="flex items-center mt-2 text-gray-500">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{property.location.address}, {property.location.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">
                    {property.price.toLocaleString()} SAR
                  </p>
                  {property.category === 'rent' && (
                    <p className="text-sm text-gray-500">per month</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-6">
                <button
                  onClick={handleFavoriteToggle}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    isFavorite
                      ? 'bg-error-50 text-error-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    navigator.share({
                      title: property.title,
                      text: property.description,
                      url: window.location.href,
                    }).catch(() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied to clipboard');
                    });
                  }}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Property Details</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {property.bedrooms !== undefined && (
                  <div className="flex items-center">
                    <Bed className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms</p>
                      <p className="font-medium">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                
                {property.bathrooms !== undefined && (
                  <div className="flex items-center">
                    <Bath className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Bathrooms</p>
                      <p className="font-medium">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
                
                {property.area !== undefined && (
                  <div className="flex items-center">
                    <Home className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Area</p>
                      <p className="font-medium">{property.area} m²</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Listed</p>
                    <p className="font-medium">
                      {new Date(property.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-line">{property.description}</p>

              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <div className="h-2 w-2 bg-primary-600 rounded-full mr-2"></div>
                      <span className="text-gray-600">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {property.location.coordinates && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="h-64 bg-gray-100 rounded-lg">
                  {/* Add map component here */}
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Map will be displayed here
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Agent</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Agent Name</p>
                    <p className="font-medium">John Doe</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">+966 12 345 6789</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">agent@example.com</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowContactForm(true)}
                className="w-full mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Message
              </button>
            </div>

            {showContactForm && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Send Message</h3>
                
                <form onSubmit={handleContactSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                        Your Message
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="I'm interested in this property..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingMessage || !message.trim()}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {sendingMessage ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                            <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;