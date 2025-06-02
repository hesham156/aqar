import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Building2,
  MapPin,
  DollarSign,
  Upload,
  Plus,
  X,
  Loader2,
  Save,
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { db, storage } from '../../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PropertyType, PropertyCategory, PropertyFeature } from '../../../types/property';
import { toast } from 'react-toastify';

const AddProperty = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'office', label: 'Office' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
  ];

  const cities = [
    'Riyadh',
    'Jeddah',
    'Mecca',
    'Medina',
    'Dammam',
    'Al Khobar',
    'Dhahran',
    'Tabuk',
    'Abha',
    'Taif',
  ];

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      price: '',
      type: 'apartment' as PropertyType,
      category: 'sale' as PropertyCategory,
      bedrooms: '',
      bathrooms: '',
      area: '',
      address: '',
      city: '',
      features: [] as string[],
    },
    validationSchema: Yup.object({
      title: Yup.string()
        .required('Title is required')
        .min(10, 'Title must be at least 10 characters')
        .max(100, 'Title must be less than 100 characters'),
      description: Yup.string()
        .required('Description is required')
        .min(50, 'Description must be at least 50 characters')
        .max(2000, 'Description must be less than 2000 characters'),
      price: Yup.number()
        .required('Price is required')
        .positive('Price must be positive')
        .min(1000, 'Price must be at least 1,000 SAR'),
      type: Yup.string().required('Property type is required'),
      category: Yup.string().required('Category is required'),
      bedrooms: Yup.number()
        .min(0, 'Bedrooms cannot be negative')
        .when('type', {
          is: (type: string) => ['apartment', 'villa'].includes(type),
          then: (schema) => schema.required('Number of bedrooms is required'),
        }),
      bathrooms: Yup.number()
        .min(0, 'Bathrooms cannot be negative')
        .when('type', {
          is: (type: string) => ['apartment', 'villa'].includes(type),
          then: (schema) => schema.required('Number of bathrooms is required'),
        }),
      area: Yup.number()
        .required('Area is required')
        .positive('Area must be positive'),
      address: Yup.string().required('Address is required'),
      city: Yup.string().required('City is required'),
      features: Yup.array().min(1, 'Select at least one feature'),
    }),
    onSubmit: async (values) => {
      if (!user) return;
      if (selectedImages.length === 0) {
        toast.error('Please upload at least one image');
        return;
      }

      setIsUploading(true);
      try {
        // Upload images first
        const uploadPromises = selectedImages.map(async (image) => {
          const storageRef = ref(storage, `properties/${Date.now()}_${image.name}`);
          await uploadBytes(storageRef, image);
          return getDownloadURL(storageRef);
        });

        const uploadedUrls = await Promise.all(uploadPromises);

        // Create property document
        const propertyData = {
          title: values.title,
          description: values.description,
          price: Number(values.price),
          type: values.type,
          category: values.category,
          bedrooms: values.bedrooms ? Number(values.bedrooms) : undefined,
          bathrooms: values.bathrooms ? Number(values.bathrooms) : undefined,
          area: Number(values.area),
          images: uploadedUrls,
          location: {
            address: values.address,
            city: values.city,
          },
          features: values.features.map(feature => ({
            name: feature,
            value: true
          })) as PropertyFeature[],
          sellerId: user.uid,
          sellerName: user.displayName,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          views: 0,
          favorites: 0,
          inquiries: 0,
        };

        const docRef = await addDoc(collection(db, 'properties'), propertyData);
        
        toast.success('Property listed successfully! Awaiting approval.');
        navigate('/dashboard/seller');
      } catch (error) {
        console.error('Error creating property:', error);
        toast.error('Failed to create property listing');
      } finally {
        setIsUploading(false);
      }
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        toast.error(`${file.name} is not a valid image file`);
      }
      return isValid;
    });

    if (selectedImages.length + validFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    setSelectedImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const commonFeatures = [
    'Air Conditioning',
    'Central Heating',
    'Built-in Kitchen Appliances',
    'High-speed Internet',
    'Security System',
    'Parking',
    'Swimming Pool',
    'Gym',
    'Garden',
    'Balcony',
    'Storage Room',
    'Elevator',
    '24/7 Security',
    'Backup Generator',
  ];

  return (
    <DashboardLayout title="Add New Property">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={formik.handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Property Title
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className={`block w-full px-3 py-2 border ${
                      formik.touched.title && formik.errors.title
                        ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                    placeholder="e.g., Modern Villa with Pool in Riyadh"
                    {...formik.getFieldProps('title')}
                  />
                </div>
                {formik.touched.title && formik.errors.title && (
                  <p className="mt-1 text-sm text-error-600">{formik.errors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={5}
                    className={`block w-full px-3 py-2 border ${
                      formik.touched.description && formik.errors.description
                        ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                    placeholder="Describe your property in detail..."
                    {...formik.getFieldProps('description')}
                  />
                </div>
                {formik.touched.description && formik.errors.description && (
                  <p className="mt-1 text-sm text-error-600">{formik.errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Property Type
                  </label>
                  <div className="mt-1">
                    <select
                      id="type"
                      name="type"
                      className={`block w-full px-3 py-2 border ${
                        formik.touched.type && formik.errors.type
                          ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                          : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                      } rounded-md shadow-sm focus:outline-none focus:ring-2`}
                      {...formik.getFieldProps('type')}
                    >
                      {propertyTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formik.touched.type && formik.errors.type && (
                    <p className="mt-1 text-sm text-error-600">{formik.errors.type}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <div className="mt-1">
                    <select
                      id="category"
                      name="category"
                      className={`block w-full px-3 py-2 border ${
                        formik.touched.category && formik.errors.category
                          ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                          : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                      } rounded-md shadow-sm focus:outline-none focus:ring-2`}
                      {...formik.getFieldProps('category')}
                    >
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                    </select>
                  </div>
                  {formik.touched.category && formik.errors.category && (
                    <p className="mt-1 text-sm text-error-600">{formik.errors.category}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Property Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price (SAR)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      formik.touched.price && formik.errors.price
                        ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                    placeholder="Enter price"
                    {...formik.getFieldProps('price')}
                  />
                </div>
                {formik.touched.price && formik.errors.price && (
                  <p className="mt-1 text-sm text-error-600">{formik.errors.price}</p>
                )}
              </div>

              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-700">
                  Area (m²)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="area"
                    name="area"
                    className={`block w-full px-3 py-2 border ${
                      formik.touched.area && formik.errors.area
                        ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                    placeholder="Enter area"
                    {...formik.getFieldProps('area')}
                  />
                </div>
                {formik.touched.area && formik.errors.area && (
                  <p className="mt-1 text-sm text-error-600">{formik.errors.area}</p>
                )}
              </div>

              {(formik.values.type === 'apartment' || formik.values.type === 'villa') && (
                <>
                  <div>
                    <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">
                      Bedrooms
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="bedrooms"
                        name="bedrooms"
                        className={`block w-full px-3 py-2 border ${
                          formik.touched.bedrooms && formik.errors.bedrooms
                            ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                        placeholder="Number of bedrooms"
                        {...formik.getFieldProps('bedrooms')}
                      />
                    </div>
                    {formik.touched.bedrooms && formik.errors.bedrooms && (
                      <p className="mt-1 text-sm text-error-600">{formik.errors.bedrooms}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">
                      Bathrooms
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="bathrooms"
                        name="bathrooms"
                        className={`block w-full px-3 py-2 border ${
                          formik.touched.bathrooms && formik.errors.bathrooms
                            ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                        placeholder="Number of bathrooms"
                        {...formik.getFieldProps('bathrooms')}
                      />
                    </div>
                    {formik.touched.bathrooms && formik.errors.bathrooms && (
                      <p className="mt-1 text-sm text-error-600">{formik.errors.bathrooms}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Location</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <div className="mt-1">
                  <select
                    id="city"
                    name="city"
                    className={`block w-full px-3 py-2 border ${
                      formik.touched.city && formik.errors.city
                        ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-md shadow-sm focus:outline-none focus:ring-2`}
                    {...formik.getFieldProps('city')}
                  >
                    <option value="">Select a city</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                {formik.touched.city && formik.errors.city && (
                  <p className="mt-1 text-sm text-error-600">{formik.errors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    className={`block w-full px-3 py-2 border ${
                      formik.touched.address && formik.errors.address
                        ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                    placeholder="Enter street address"
                    {...formik.getFieldProps('address')}
                  />
                </div>
                {formik.touched.address && formik.errors.address && (
                  <p className="mt-1 text-sm text-error-600">{formik.errors.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Features</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {commonFeatures.map((feature) => (
                <div key={feature} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`feature-${feature}`}
                    name="features"
                    value={feature}
                    checked={formik.values.features.includes(feature)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        formik.setFieldValue('features', [...formik.values.features, feature]);
                      } else {
                        formik.setFieldValue(
                          'features',
                          formik.values.features.filter((f) => f !== feature)
                        );
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`feature-${feature}`}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {feature}
                  </label>
                </div>
              ))}
            </div>
            {formik.touched.features && formik.errors.features && (
              <p className="mt-2 text-sm text-error-600">{formik.errors.features}</p>
            )}
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Property Images</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="images"
                  className="w-full h-32 flex flex-col items-center justify-center px-4 py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Click to upload images</p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 10 images</p>
                  <input
                    type="file"
                    id="images"
                    name="images"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              </div>

              {imageUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/seller')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !formik.isValid || !formik.dirty}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Creating Property...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Create Property
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddProperty;