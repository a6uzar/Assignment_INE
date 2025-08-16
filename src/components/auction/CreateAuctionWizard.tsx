import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { auctionService } from '@/lib/api/auctions';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const auctionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category_id: z.string().min(1, 'Please select a category'),
  starting_price: z.number().min(1, 'Starting price must be at least $1'),
  bid_increment: z.number().min(1, 'Bid increment must be at least $1'),
  reserve_price: z.number().optional(),
  start_time: z.string().min(1, 'Please select a start time'),
  end_time: z.string().min(1, 'Please select an end time'),
  condition: z.string().optional(),
  location: z.string().optional(),
  shipping_cost: z.number().min(0, 'Shipping cost cannot be negative'),
  images: z.array(z.string()).default([]),
});

type AuctionFormData = z.infer<typeof auctionSchema>;

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
  const [categories, setCategories] = useState<Array<{id: string, name: string, icon: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, icon')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          // Use fallback categories if database fetch fails
          setCategories(FALLBACK_CATEGORIES);
        } else {
          setCategories(data || []);
        }
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
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      shipping_cost: 0,
      images: [],
    },
  });

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
      // Validate required fields
      if (!data.title || !data.description || !data.category_id) {
        throw new Error("Please fill in all required fields");
      }

      if (!data.start_time || !data.end_time) {
        throw new Error("Please set auction start and end times");
      }

      const auctionData = {
        title: data.title,
        description: data.description,
        category_id: data.category_id,
        starting_price: Number(data.starting_price),
        bid_increment: Number(data.bid_increment),
        reserve_price: data.reserve_price ? Number(data.reserve_price) : null,
        start_time: data.start_time,
        end_time: data.end_time,
        condition: data.condition || 'used',
        location: data.location || '',
        shipping_cost: Number(data.shipping_cost) || 0,
        images: data.images || [],
        seller_id: user.id,
        status: 'draft' as const,
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
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-colors text-center ${
                          watchedValues.category_id === category.id
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => setValue('category_id', category.id)}
                      >
                        <div className="text-2xl mb-1">{category.icon}</div>
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
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('reserve_price', { valueAsNumber: true })}
                  className="pl-10"
                  placeholder="Minimum acceptable price (optional)"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                The reserve price is the minimum amount you'll accept. Bidders won't see this amount.
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
                {watchedValues.reserve_price && (
                  <div className="flex justify-between">
                    <span>Reserve Price:</span>
                    <span className="font-semibold text-orange-500">
                      ${watchedValues.reserve_price.toLocaleString()}
                    </span>
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
            <div className="space-y-2">
              <Label>Item Images</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Upload Images</p>
                <p className="text-muted-foreground mb-4">
                  Add up to 10 high-quality images of your item
                </p>
                <Button type="button" variant="outline">
                  Choose Files
                </Button>
              </div>
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
                  {watchedValues.reserve_price && (
                    <div>
                      <span className="text-sm text-muted-foreground">Reserve Price:</span>
                      <p className="font-semibold">${watchedValues.reserve_price.toLocaleString()}</p>
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
