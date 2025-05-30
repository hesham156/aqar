import { useState, useEffect } from 'react';
import {
  User,
  AtSign,
  Phone,
  Lock,
  MapPin,
  Bell,
  CreditCard,
  Shield,
  Save,
  Camera
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber: string;
  role: string;
  address?: string;
  city?: string;
  postalCode?: string;
  about?: string;
  photoURL?: string;
  notificationSettings?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setProfile(userData);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const formik = useFormik({
    initialValues: {
      displayName: profile?.displayName || '',
      email: profile?.email || '',
      phoneNumber: profile?.phoneNumber || '',
      address: profile?.address || '',
      city: profile?.city || '',
      postalCode: profile?.postalCode || '',
      about: profile?.about || '',
      emailNotifications: profile?.notificationSettings?.email || true,
      pushNotifications: profile?.notificationSettings?.push || true,
      smsNotifications: profile?.notificationSettings?.sms || false,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      displayName: Yup.string().required('Name is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      phoneNumber: Yup.string()
        .matches(
          /^(05|9665)\d{8}$/,
          'Phone number must be a valid Saudi number (start with 05 or 9665)'
        )
        .required('Phone number is required'),
      address: Yup.string(),
      city: Yup.string(),
      postalCode: Yup.string(),
      about: Yup.string().max(500, 'About must be 500 characters or less'),
    }),
    onSubmit: async (values) => {
      if (!user) return;
      
      setIsSaving(true);
      try {
        let photoURL = profile?.photoURL;
        
        // Upload new avatar if selected
        if (avatarFile) {
          const storageRef = ref(storage, `user-avatars/${user.uid}`);
          await uploadBytes(storageRef, avatarFile);
          photoURL = await getDownloadURL(storageRef);
        }
        
        // Update user profile in Firestore
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: values.displayName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          address: values.address,
          city: values.city,
          postalCode: values.postalCode,
          about: values.about,
          photoURL,
          notificationSettings: {
            email: values.emailNotifications,
            push: values.pushNotifications,
            sms: values.smsNotifications,
          },
          updatedAt: new Date().toISOString(),
        });
        
        setProfile({
          ...profile!,
          displayName: values.displayName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          address: values.address,
          city: values.city,
          postalCode: values.postalCode,
          about: values.about,
          photoURL,
          notificationSettings: {
            email: values.emailNotifications,
            push: values.pushNotifications,
            sms: values.smsNotifications,
          },
        });
        
        toast.success('Profile updated successfully');
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      } finally {
        setIsSaving(false);
      }
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Profile">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile Settings">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="px-6 flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'notifications'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notification Settings
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-4 text-sm font-medium border-b-2 ${
                activeTab === 'security'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Security
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          <form onSubmit={formik.handleSubmit}>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* User Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  
                  {/* Avatar */}
                  <div className="flex items-center mb-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="h-full w-full object-cover"
                          />
                        ) : profile?.photoURL ? (
                          <img
                            src={profile.photoURL}
                            alt={profile.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary-100 text-primary-600">
                            <User className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 p-1 bg-white rounded-full border border-gray-300 cursor-pointer hover:bg-gray-50"
                      >
                        <Camera className="h-5 w-5 text-gray-600" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                    <div className="ml-6">
                      <h4 className="text-md font-medium text-gray-900">{profile?.displayName}</h4>
                      <p className="text-sm text-gray-500">{profile?.role}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click on the camera icon to change your profile picture
                      </p>
                    </div>
                  </div>
                  
                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="displayName"
                          id="displayName"
                          className={`block w-full pl-10 pr-3 py-2 border ${
                            formik.touched.displayName && formik.errors.displayName
                              ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                          placeholder="John Doe"
                          value={formik.values.displayName}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {formik.touched.displayName && formik.errors.displayName && (
                        <p className="mt-1 text-sm text-error-600">{formik.errors.displayName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <AtSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          className={`block w-full pl-10 pr-3 py-2 border ${
                            formik.touched.email && formik.errors.email
                              ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                          placeholder="you@example.com"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {formik.touched.email && formik.errors.email && (
                        <p className="mt-1 text-sm text-error-600">{formik.errors.email}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          name="phoneNumber"
                          id="phoneNumber"
                          className={`block w-full pl-10 pr-3 py-2 border ${
                            formik.touched.phoneNumber && formik.errors.phoneNumber
                              ? 'border-error-300 focus:ring-error-500 focus:border-error-500'
                              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                          } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2`}
                          placeholder="05xxxxxxxx"
                          value={formik.values.phoneNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                        <p className="mt-1 text-sm text-error-600">{formik.errors.phoneNumber}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Must be a valid Saudi number starting with 05 or 9665
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          name="city"
                          id="city"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={formik.values.city}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        >
                          <option value="">Select a city</option>
                          <option value="Riyadh">Riyadh</option>
                          <option value="Jeddah">Jeddah</option>
                          <option value="Mecca">Mecca</option>
                          <option value="Medina">Medina</option>
                          <option value="Dammam">Dammam</option>
                          <option value="Tabuk">Tabuk</option>
                          <option value="Al Khobar">Al Khobar</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <textarea
                        name="address"
                        id="address"
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter your address"
                        value={formik.values.address}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-1">
                      About
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <textarea
                        name="about"
                        id="about"
                        rows={4}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Tell us about yourself"
                        value={formik.values.about}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      ></textarea>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Brief description for your profile. URLs are hyperlinked.
                    </p>
                    {formik.touched.about && formik.errors.about && (
                      <p className="mt-1 text-sm text-error-600">{formik.errors.about}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Manage how you receive notifications and updates from Aqar
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="emailNotifications"
                        name="emailNotifications"
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={formik.values.emailNotifications}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="emailNotifications" className="font-medium text-gray-700">
                        Email Notifications
                      </label>
                      <p className="text-gray-500">
                        Receive email notifications for new inquiries, offers, and account updates
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="pushNotifications"
                        name="pushNotifications"
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={formik.values.pushNotifications}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="pushNotifications" className="font-medium text-gray-700">
                        Push Notifications
                      </label>
                      <p className="text-gray-500">
                        Receive real-time notifications in the browser when you're on the platform
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="smsNotifications"
                        name="smsNotifications"
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={formik.values.smsNotifications}
                        onChange={formik.handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="smsNotifications" className="font-medium text-gray-700">
                        SMS Notifications
                      </label>
                      <p className="text-gray-500">
                        Receive text messages for critical updates and important activity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Manage your account security and password
                </p>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Change Password</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="currentPassword"
                            id="currentPassword"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Enter current password"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="newPassword"
                            id="newPassword"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Enter new password"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Password must be at least 8 characters and include a mix of letters, numbers, and symbols
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="confirmPassword"
                            id="confirmPassword"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        type="button"
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Account Security</h4>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                        <div className="flex items-start">
                          <Shield className="h-6 w-6 text-gray-400 mt-0.5" />
                          <div className="ml-3">
                            <h5 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h5>
                            <p className="text-xs text-gray-500">
                              Add an extra layer of security to your account
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Enable
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                        <div className="flex items-start">
                          <CreditCard className="h-6 w-6 text-gray-400 mt-0.5" />
                          <div className="ml-3">
                            <h5 className="text-sm font-medium text-gray-900">Payment Methods</h5>
                            <p className="text-xs text-gray-500">
                              Manage your connected payment methods
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Form Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors mr-3"
                onClick={() => formik.resetForm()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !formik.dirty || !formik.isValid}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                      <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;