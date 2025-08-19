import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Truck,
  Loader2,
  X,
  Image
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { auctionService } from '@/lib/api/auctions';
import { getCategoriesWithFallback } from '@/lib/categoryUtils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ensureUserProfile } from '@/utils/userProfile';

// Form input schema (what the form receives)
const auctionFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category_id: z.string().min(1, 'Please select a category'),
  starting_price: z.number().min(1, 'Starting price must be at least $1'),
  bid_increment: z.number().min(1, 'Bid increment must be at least $1'),
  reserve_price: z.string().optional().refine((val) => {
    // Allow empty string or undefined
    if (!val || val === '') return true;
    // Check if it's a valid number
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, {
    message: "Reserve price must be a valid number greater than or equal to 0"
  }),
  start_time: z.string().min(1, 'Please select a start time'),
  end_time: z.string().min(1, 'Please select an end time'),
  condition: z.string().optional(),
  location: z.string().optional(),
  shipping_cost: z.number().min(0, 'Shipping cost cannot be negative'),
  images: z.array(z.string()).default([]),
});

// API submission schema (what gets sent to the API)
const auctionSchema = auctionFormSchema.transform((data) => ({
  ...data,
  reserve_price: data.reserve_price && data.reserve_price !== '' && data.reserve_price !== '0'
    ? parseFloat(data.reserve_price)
    : undefined,
})).refine((data) => {
  // Validate reserve price is greater than or equal to starting price
  if (data.reserve_price !== undefined && data.reserve_price !== null && data.reserve_price > 0) {
    return data.reserve_price >= data.starting_price;
  }
  return true;
}, {
  message: "Reserve price must be greater than or equal to starting price",
  path: ["reserve_price"],
});

type AuctionFormData = z.infer<typeof auctionFormSchema>;

const STEPS = [
  { id: 1, title: 'Basic Details', description: 'Item information and description' },
  { id: 2, title: 'Pricing', description: 'Set prices and bidding rules' },
  { id: 3, title: 'Schedule', description: 'When your auction runs' },
  { id: 4, title: 'Images & Location', description: 'Photos and shipping details' },
  { id: 5, title: 'Review', description: 'Confirm your auction details' },
];

const FALLBACK_CATEGORIES = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Electronics', icon: '💻' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Art & Collectibles', icon: '🎨' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Jewelry & Watches', icon: '💎' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Vehicles', icon: '🚗' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Real Estate', icon: '🏠' },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Sports & Recreation', icon: '🏀' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Fashion & Accessories', icon: '👕' },
  { id: '88888888-8888-8888-8888-888888888888', name: 'Home & Garden', icon: '🏡' },
];

const CATEGORIES = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Electronics', icon: '💻' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Art & Collectibles', icon: '🎨' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Jewelry & Watches', icon: '💎' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Vehicles', icon: '🚗' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Real Estate', icon: '🏠' },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Sports & Recreation', icon: '🏀' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Fashion & Accessories', icon: '👕' },
  { id: '88888888-8888-8888-8888-888888888888', name: 'Home & Garden', icon: '🏡' },
];

export function CreateAuctionWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string, name: string, icon: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<{ [key: string]: number }>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategoriesWithFallback();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<AuctionFormData>({
    resolver: zodResolver(auctionFormSchema),
    defaultValues: {
      shipping_cost: 0,
      images: [],
      reserve_price: '', // Set as empty string instead of undefined
    },
  });

  // Image upload functions
  const uploadImageToSupabase = async (file: File): Promise<string> => {
    try {
      console.log('Starting upload for file:', file.name, 'Size:', file.size);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      console.log('Uploading to path:', filePath);

      // Try to upload directly first
      const { data, error } = await supabase.storage
        .from('auction-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);

        // If bucket doesn't exist, the migration should have created it
        // But if it still fails, provide helpful error message
        if (error.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please ensure database migrations have been applied.');
        }

        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('Upload successful:', data);

      const { data: publicUrlData } = supabase.storage
        .from('auction-images')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Upload function error:', error);
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (uploadedImages.length + acceptedFiles.length > 10) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 10 images",
        variant: "destructive",
      });
      return;
    }

    setUploadingImages(true);
    const uploadPromises = acceptedFiles.map(async (file) => {
      const fileId = `${file.name}-${Date.now()}`;
      setImageUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setImageUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
          }));
        }, 100);

        const imageUrl = await uploadImageToSupabase(file);

        clearInterval(progressInterval);
        setImageUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        setTimeout(() => {
          setImageUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 1000);

        return imageUrl;
      } catch (error) {
        console.error('Error uploading image:', error);
        setImageUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean) as string[];

      setUploadedImages(prev => [...prev, ...successfulUploads]);
      setValue('images', [...uploadedImages, ...successfulUploads]);

      toast({
        title: "Upload successful",
        description: `${successfulUploads.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Error in batch upload:', error);
    } finally {
      setUploadingImages(false);
    }
  }, [uploadedImages, setValue, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles: 10,
    maxSize: 5242880, // 5MB
    disabled: uploadingImages
  });

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setValue('images', newImages);
  };

  const watchedValues = watch();
  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = async () => {
    const isStepValid = await validateCurrentStep();
    if (isStepValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = async () => {
    const fieldsToValidate: { [key: number]: (keyof AuctionFormData)[] } = {
      1: ['title', 'description', 'category_id', 'condition'],
      2: ['starting_price', 'bid_increment', 'reserve_price'],
      3: ['start_time', 'end_time'],
      4: ['location', 'shipping_cost'],
    };

    const fields = fieldsToValidate[currentStep];
    if (fields) {
      return await trigger(fields);
    }
    return true;
  };

  const onSubmit = async (data: AuctionFormData) => {
    console.log('Submit triggered with data:', data);
    console.log('Current user:', user);

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create an auction.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure user profile exists in the database
      const userProfileExists = await ensureUserProfile();
      if (!userProfileExists) {
        throw new Error("Failed to create user profile. Please try logging out and logging back in.");
      }

      // Validate required fields
      if (!data.title || !data.description || !data.category_id) {
        throw new Error("Please fill in all required fields");
      }

      if (!data.start_time || !data.end_time) {
        throw new Error("Please set auction start and end times");
      }

      // Determine auction status based on start time
      const now = new Date();
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);

      let auctionStatus: 'draft' | 'scheduled' | 'active' = 'draft';

      if (startTime <= now && endTime > now) {
        auctionStatus = 'active';
      } else if (startTime > now) {
        auctionStatus = 'scheduled';
      } else {
        // If start time is in the past but end time is also past, keep as draft for user to review
        auctionStatus = 'draft';
      }

      const auctionData = {
        title: data.title,
        description: data.description,
        category_id: data.category_id,
        starting_price: Number(data.starting_price),
        bid_increment: Number(data.bid_increment),
        reserve_price: data.reserve_price && !isNaN(Number(data.reserve_price)) && Number(data.reserve_price) > 0
          ? Number(data.reserve_price)
          : null,
        start_time: data.start_time,
        end_time: data.end_time,
        condition: data.condition || 'used',
        location: data.location || '',
        shipping_cost: Number(data.shipping_cost) || 0,
        images: data.images || [],
        seller_id: user.id,
        status: auctionStatus,
      };

      console.log('Auction data to submit:', auctionData);

      const { data: auction, error } = await auctionService.createAuction(auctionData);

      if (error) {
        console.error('Auction creation error:', error);
        throw new Error(error.message || 'Failed to create auction');
      }

      console.log('Auction created successfully:', auction);

      toast({
        title: "Auction Created!",
        description: "Your auction has been created successfully.",
      });

      navigate(`/auction/${auction.id}`);
    } catch (error: unknown) {
      console.error('Create auction error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create auction. Please check the database is set up correctly.";
      toast({
        title: "Error Creating Auction",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Auction Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter a compelling title for your item"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your item in detail..."
                rows={4}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              {loadingCategories ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading categories...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories.map((category) => (
                    <motion.div
                      key={category.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors text-center min-h-[120px] flex flex-col items-center justify-center ${watchedValues.category_id === category.id
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                          }`}
                        onClick={() => setValue('category_id', category.id)}
                      >
                        <div
                          className="text-4xl mb-2 emoji-display"
                          style={{
                            fontSize: '3rem',
                            lineHeight: '1',
                            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", "EmojiSymbols", sans-serif'
                          }}
                        >
                          {category.icon}
                        </div>
                        <p className="text-sm font-medium">{category.name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select onValueChange={(value) => setValue('condition', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like-new">Like New</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="starting_price">Starting Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="starting_price"
                    type="number"
                    step="0.01"
                    min="1"
                    {...register('starting_price', { valueAsNumber: true })}
                    className={`pl-10 ${errors.starting_price ? 'border-destructive' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.starting_price && (
                  <p className="text-sm text-destructive">{errors.starting_price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bid_increment">Bid Increment *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bid_increment"
                    type="number"
                    step="0.01"
                    min="1"
                    {...register('bid_increment', { valueAsNumber: true })}
                    className={`pl-10 ${errors.bid_increment ? 'border-destructive' : ''}`}
                    placeholder="1.00"
                  />
                </div>
                {errors.bid_increment && (
                  <p className="text-sm text-destructive">{errors.bid_increment.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reserve_price">Reserve Price (Optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reserve_price"
                  type="text"
                  {...register('reserve_price')}
                  className={`pl-10 ${errors.reserve_price ? 'border-destructive' : ''}`}
                  placeholder="Minimum acceptable price (optional)"
                />
              </div>
              {errors.reserve_price && (
                <p className="text-sm text-destructive">{errors.reserve_price.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                The reserve price is the minimum amount you'll accept. It must be at least equal to your starting price. Bidders won't see this amount.
              </p>
            </div>

            {/* Pricing Preview */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Pricing Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Starting Price:</span>
                  <span className="font-semibold">
                    ${watchedValues.starting_price?.toLocaleString() || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Next Bid:</span>
                  <span className="font-semibold text-primary">
                    ${((watchedValues.starting_price || 0) + (watchedValues.bid_increment || 0)).toLocaleString()}
                  </span>
                </div>
                {watchedValues.reserve_price &&
                  watchedValues.reserve_price !== '' &&
                  !isNaN(parseFloat(watchedValues.reserve_price)) &&
                  parseFloat(watchedValues.reserve_price) > 0 && (
                    <div className="flex justify-between">
                      <span>Reserve Price:</span>
                      <span className={`font-semibold ${parseFloat(watchedValues.reserve_price) < (watchedValues.starting_price || 0)
                        ? 'text-destructive'
                        : 'text-orange-500'
                        }`}>
                        ${parseFloat(watchedValues.reserve_price).toLocaleString()}
                      </span>
                    </div>
                  )}
                {watchedValues.reserve_price &&
                  watchedValues.starting_price &&
                  watchedValues.reserve_price !== '' &&
                  !isNaN(parseFloat(watchedValues.reserve_price)) &&
                  parseFloat(watchedValues.reserve_price) > 0 &&
                  parseFloat(watchedValues.reserve_price) < watchedValues.starting_price && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      ⚠️ Reserve price must be at least ${watchedValues.starting_price.toLocaleString()}
                    </div>
                  )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_time">Auction Start Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="start_time"
                    type="datetime-local"
                    {...register('start_time')}
                    className={`pl-10 ${errors.start_time ? 'border-destructive' : ''}`}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                {errors.start_time && (
                  <p className="text-sm text-destructive">{errors.start_time.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">Auction End Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="end_time"
                    type="datetime-local"
                    {...register('end_time')}
                    className={`pl-10 ${errors.end_time ? 'border-destructive' : ''}`}
                    min={watchedValues.start_time || new Date().toISOString().slice(0, 16)}
                  />
                </div>
                {errors.end_time && (
                  <p className="text-sm text-destructive">{errors.end_time.message}</p>
                )}
              </div>
            </div>

            {/* Quick Duration Buttons */}
            <div className="space-y-2">
              <Label>Quick Duration</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: '1 Hour', hours: 1 },
                  { label: '6 Hours', hours: 6 },
                  { label: '1 Day', hours: 24 },
                  { label: '3 Days', hours: 72 },
                  { label: '7 Days', hours: 168 },
                  { label: '14 Days', hours: 336 },
                ].map((duration) => (
                  <Button
                    key={duration.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const startTime = watchedValues.start_time || new Date().toISOString().slice(0, 16);
                      const endTime = new Date(new Date(startTime).getTime() + duration.hours * 60 * 60 * 1000);
                      setValue('end_time', endTime.toISOString().slice(0, 16));
                    }}
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Schedule Preview */}
            {watchedValues.start_time && watchedValues.end_time && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Schedule Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Starts:</span>
                    <span className="font-semibold">
                      {new Date(watchedValues.start_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ends:</span>
                    <span className="font-semibold">
                      {new Date(watchedValues.end_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-semibold text-primary">
                      {Math.round((new Date(watchedValues.end_time).getTime() - new Date(watchedValues.start_time).getTime()) / (1000 * 60 * 60))} hours
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Image Upload */}
            <div className="space-y-4">
              <Label>Item Images (up to 10)</Label>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDragActive
                    ? 'border-primary bg-primary/5'
                    : uploadingImages
                      ? 'border-muted-foreground/25 bg-muted/50'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
              >
                <input {...getInputProps()} />
                {uploadingImages ? (
                  <>
                    <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-lg font-medium mb-2">Uploading Images...</p>
                    <p className="text-muted-foreground">Please wait while we upload your images</p>
                  </>
                ) : isDragActive ? (
                  <>
                    <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2 text-primary">Drop images here</p>
                    <p className="text-muted-foreground">Release to upload your images</p>
                  </>
                ) : (
                  <>
                    <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Drag & Drop Images Here</p>
                    <p className="text-muted-foreground mb-4">
                      Or click to select files (Max 10 images, 5MB each)
                    </p>
                    <Button type="button" variant="outline" disabled={uploadingImages}>
                      Choose Files
                    </Button>
                  </>
                )}
              </div>

              {/* Upload Progress */}
              {Object.keys(imageUploadProgress).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(imageUploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{fileId.split('-')[0]}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* Image Preview Grid */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedImages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No images uploaded yet. Add some high-quality photos to attract more bidders!
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    {...register('location')}
                    className="pl-10"
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_cost">Shipping Cost</Label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="shipping_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('shipping_cost', { valueAsNumber: true })}
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter 0 for free shipping
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Review Your Auction</h3>
              <p className="text-muted-foreground">
                Please review all details before creating your auction
              </p>
            </div>

            {/* Review Summary */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Title:</span>
                    <p className="font-semibold">{watchedValues.title}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <p className="font-semibold">
                      {CATEGORIES.find(c => c.id === watchedValues.category_id)?.name}
                    </p>
                  </div>
                  {watchedValues.condition && (
                    <div>
                      <span className="text-sm text-muted-foreground">Condition:</span>
                      <p className="font-semibold capitalize">{watchedValues.condition}</p>
                    </div>
                  )}
                  {watchedValues.location && (
                    <div>
                      <span className="text-sm text-muted-foreground">Location:</span>
                      <p className="font-semibold">{watchedValues.location}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing & Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Starting Price:</span>
                    <p className="font-semibold">${watchedValues.starting_price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Bid Increment:</span>
                    <p className="font-semibold">${watchedValues.bid_increment?.toLocaleString()}</p>
                  </div>
                  {watchedValues.reserve_price &&
                    watchedValues.reserve_price !== '' &&
                    !isNaN(parseFloat(watchedValues.reserve_price)) &&
                    parseFloat(watchedValues.reserve_price) > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Reserve Price:</span>
                        <p className="font-semibold">${parseFloat(watchedValues.reserve_price).toLocaleString()}</p>
                      </div>
                    )}
                  <div>
                    <span className="text-sm text-muted-foreground">Duration:</span>
                    <p className="font-semibold">
                      {watchedValues.start_time && watchedValues.end_time &&
                        Math.round((new Date(watchedValues.end_time).getTime() - new Date(watchedValues.start_time).getTime()) / (1000 * 60 * 60))
                      } hours
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800">Before you submit</h4>
                    <ul className="text-sm text-green-700 mt-1 space-y-1">
                      <li>• Double-check all auction details for accuracy</li>
                      <li>• Ensure your images clearly show the item</li>
                      <li>• Review the start and end times</li>
                      <li>• Confirm your pricing strategy</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-8">
      <div className="container max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Create New Auction</CardTitle>
                <CardDescription>
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>

              <Separator className="my-8" />

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {isSubmitting ? 'Creating...' : 'Create Auction'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
