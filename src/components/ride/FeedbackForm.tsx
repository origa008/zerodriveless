import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
interface FeedbackFormProps {
  onSubmit: (rating: number, comment: string) => void;
}
const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmit
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const {
    toast
  } = useToast();
  const handleSubmit = () => {
    onSubmit(rating, comment);
    toast({
      title: "Thank you for your feedback!",
      description: "Your rating has been submitted successfully."
    });
  };
  return <div className="p-6 bg-white rounded-3xl shadow-sm">
      <h3 className="text-2xl font-medium mb-4 text-center">How was your ride?</h3>
      
      <div className="flex justify-center mb-6">
        {[1, 2, 3, 4, 5].map(star => <Star key={star} size={36} className={`cursor-pointer ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} onClick={() => setRating(star)} />)}
      </div>
      
      <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." className="w-full p-4 border border-gray-200 rounded-xl h-32 focus:outline-none focus:ring-2 focus:ring-zerodrive-purple" />
      
      <Button className="w-full mt-4 bg-black text-white hover:bg-gray-800 py-6 text-xl rounded-xl" onClick={handleSubmit}>
        Submit Feedback
      </Button>
    </div>;
};
export default FeedbackForm;