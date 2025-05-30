import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, MapPin, ChevronDown, X } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import PropertyCard from '../components/property/PropertyCard';
import { Property, PropertyType, PropertyCategory, PropertyFilter } from '../types/property';

const Home = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Get search query from URL parameters
  const initialSearchQuery = searchParams.get('search') || '';
  const initialCategory = (searchParams.get('category') as PropertyCategory) || undefined;
  const initialType = (searchParams.get('type') as PropertyType) || undefined;

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [filters, setFilters] = useState<PropertyFilter>({
    category: initialCategory,
    type: initialType,
    city: undefined,
    priceMin: undefined,
    priceMax: undefined,
    bedroomsMin: undefined,
    bathroomsMin: undefined,
    areaMin: undefined,
    areaMax: undefined,
  });

  // City options for Saudi Arabia
  const cities = [
    'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 
    'Al Khobar', 'Dhahran', 'Tabuk', 'Abha', 'Taif'
  ];
  
  // Property types
  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'office', label: 'Office' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
  ];

  useEffect(() => {
    fetchProperties();
  }, [initialSearchQuery, initialCategory, initialType]);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let propertiesQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      
      // Apply category filter if set
      if (initialCategory) {
        propertiesQuery = query(
          propertiesQuery,
          where('category', '==', initialCategory)
        );
      }
      
      // Apply type filter if set
      if (initialType) {
        propertiesQuery = query(
          propertiesQuery,
          where('type', '==', initialType)
        );
      }
      
      // Apply search query if set
      // Note: This is a simple implementation; full-text search would require a more advanced solution
      if (initialSearchQuery) {
        // This is a simplified approach; in a real app, you might want to use Algolia or similar
        propertiesQuery = query(
          propertiesQuery,
          where('title', '>=', initialSearchQuery),
          where('title', '<=', initialSearchQuery + '\uf8ff')
        );
      }
      
      const querySnapshot = await getDocs(propertiesQuery);
      const propertiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Property[];
      
      setProperties(propertiesData);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // In a real app, this would update URL params and trigger a new query
    console.log('Applying filters:', filters);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      category: undefined,
      type: undefined,
      city: undefined,
      priceMin: undefined,
      priceMax: undefined,
      bedroomsMin: undefined,
      bathroomsMin: undefined,
      areaMin: undefined,
      areaMax: undefined,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would update URL params and trigger a new query
    console.log('Searching for:', searchQuery);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6">
              Find Your Dream Property in Saudi Arabia
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8">
              Browse thousands of properties for sale and rent across the Kingdom
            </p>
            
            {/* Search Form */}
            <div className="bg-white rounded-lg shadow-lg p-4 md:p-0 md:flex">
              <div className="flex-1 p-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by location, property name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                  />
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="mt-2 md:mt-0 p-2">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full md:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span>Filters</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 md:mt-0 p-2">
                <button
                  onClick={handleSearch}
                  className="w-full md:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
            
            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="mt-4 bg-white rounded-lg shadow-lg p-6 text-left">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type
                    </label>
                    <select
                      value={filters.type || ''}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value as PropertyType || undefined })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Any Type</option>
                      {propertyTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value as PropertyCategory || undefined })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Any Category</option>
                      <option value="rent">For Rent</option>
                      <option value="sale">For Sale</option>
                    </select>
                  </div>
                  
                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <select
                      value={filters.city || ''}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Any City</option>
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Range (SAR)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.priceMin || ''}
                        onChange={(e) => setFilters({ ...filters, priceMin: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.priceMax || ''}
                        onChange={(e) => setFilters({ ...filters, priceMax: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-1/2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  
                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrooms
                    </label>
                    <select
                      value={filters.bedroomsMin || ''}
                      onChange={(e) => setFilters({ ...filters, bedroomsMin: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                      <option value="5">5+</option>
                    </select>
                  </div>
                  
                  {/* Bathrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms
                    </label>
                    <select
                      value={filters.bathroomsMin || ''}
                      onChange={(e) => setFilters({ ...filters, bathroomsMin: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Featured Properties */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
              Featured Properties
            </h2>
            <p className="text-gray-600 mt-2">
              Explore our handpicked selection of premium properties
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="bg-error-50 text-error-600 p-4 rounded-lg">
              {error}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-gray-600">No properties found matching your criteria.</p>
              <button
                onClick={clearFilters}
                className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
          
          {!loading && properties.length > 0 && (
            <div className="mt-10 text-center">
              <button className="px-6 py-3 bg-white text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                View More Properties
              </button>
            </div>
          )}
        </div>
      </section>
      
      {/* Featured Cities */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
              Explore Properties by City
            </h2>
            <p className="text-gray-600 mt-2">
              Find your perfect property in Saudi Arabia's most popular cities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.slice(0, 6).map((city) => (
              <a
                key={city}
                href={`/?city=${city}`}
                className="group relative overflow-hidden rounded-xl shadow-md aspect-video"
              >
                <img
                  src={`https://source.unsplash.com/random/800x600/?${city},saudi,architecture`}
                  alt={`Properties in ${city}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80"></div>
                <div className="absolute bottom-0 left-0 p-6">
                  <h3 className="text-xl font-heading font-bold text-white">{city}</h3>
                  <div className="flex items-center mt-2">
                    <MapPin className="h-4 w-4 text-primary-400 mr-1" />
                    <span className="text-sm text-white">120+ properties</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      
      {/* Why Choose Us */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
              Why Choose Aqar
            </h2>
            <p className="text-gray-600 mt-3">
              We provide a comprehensive real estate platform to help you find, buy, sell, or rent properties with ease
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 mb-2">Verified Properties</h3>
              <p className="text-gray-600">
                All our listed properties undergo a thorough verification process to ensure accuracy and legitimacy.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-secondary-100 text-secondary-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-gray-600">
                Our platform provides secure payment options to ensure your transactions are safe and protected.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-accent-100 text-accent-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 mb-2">Expert Support</h3>
              <p className="text-gray-600">
                Our team of real estate experts is available to provide guidance and answer your questions.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-12 md:py-16 bg-primary-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
              Ready to Find Your Dream Property?
            </h2>
            <p className="text-primary-100 text-lg mb-8">
              Join thousands of satisfied users who have found their perfect property through Aqar
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a
                href="/register"
                className="px-8 py-3 bg-white text-primary-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Register Now
              </a>
              <a
                href="/?category=sale"
                className="px-8 py-3 border border-white text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Browse Properties
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;